"use client";

import {
  Check,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { submitIntakeAction } from "@/features/intake/actions";
import {
  MAX_INTAKE_PHOTOS,
  PREFERRED_METHOD_LABELS,
  PREFERRED_METHODS,
  type PreferredMethod,
} from "@/features/intake/constants";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

type UploadedPhoto = {
  id: string;
  url: string;
  previewUrl: string;
};

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  itemCount: string;
  description: string;
  preferredMethod: PreferredMethod | "";
};

type Confirmation = {
  message: string;
  whatsappUrl: string;
};

const INITIAL_FORM: FormState = {
  fullName: "",
  phone: "",
  email: "",
  itemCount: "",
  description: "",
  preferredMethod: "",
};

type DesapegueFormProps = {
  storeName: string;
};

export function DesapegueForm({ storeName }: DesapegueFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        if (photo.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    };
    // Cleanup only on unmount — photos captured via closure intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStep2(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const digits = form.phone.replace(/\D/g, "");

    if (form.fullName.trim().length < 2) {
      errors.fullName = "Informe seu nome completo.";
    }

    if (!/^\d{10,15}$/.test(digits)) {
      errors.phone = "Informe o telefone com DDD, só números.";
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Informe um e-mail válido.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep3(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const count = Number(form.itemCount);

    if (!Number.isInteger(count) || count < 1) {
      errors.itemCount = "Informe a quantidade estimada de peças.";
    }

    if (form.description.trim().length < 10) {
      errors.description = "Conte um pouco mais sobre as peças.";
    }

    if (!form.preferredMethod) {
      errors.preferredMethod = "Escolha como prefere entregar as peças.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const remaining = MAX_INTAKE_PHOTOS - photos.length;

    if (remaining <= 0) {
      setUploadError(`Você pode enviar no máximo ${MAX_INTAKE_PHOTOS} fotos.`);
      return;
    }

    const selected = incoming.slice(0, remaining);
    setUploadError(null);
    setIsUploading(true);

    try {
      const uploaded: UploadedPhoto[] = [];

      for (const file of selected) {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/intake/upload", {
          method: "POST",
          body,
        });

        const payload = (await response.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;

        if (!response.ok || !payload?.url) {
          throw new Error(payload?.error ?? "Falha ao enviar a foto.");
        }

        uploaded.push({
          id: crypto.randomUUID(),
          url: payload.url,
          previewUrl: URL.createObjectURL(file),
        });
      }

      setPhotos((prev) => [...prev, ...uploaded]);

      if (incoming.length > remaining) {
        setUploadError(
          `Só cabem ${MAX_INTAKE_PHOTOS} fotos. As extras foram ignoradas.`,
        );
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Não foi possível enviar a foto.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      void handleFiles(event.target.files);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      void handleFiles(event.dataTransfer.files);
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((photo) => photo.id !== id);
    });
  }

  async function handleSubmitStep3() {
    if (!validateStep3()) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await submitIntakeAction({
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/\D/g, ""),
        email: form.email.trim(),
        itemCount: Number(form.itemCount),
        description: form.description.trim(),
        preferredMethod: form.preferredMethod,
        photoUrls: photos.map((photo) => photo.url),
      });

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      setConfirmation({
        message: result.message,
        whatsappUrl: result.whatsappUrl,
      });
      setStep(4);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(210_77%_37%/0.08),transparent_45%),radial-gradient(circle_at_bottom_right,hsl(76_51%_46%/0.12),transparent_40%)]"
      />

      <div className="relative flex flex-col gap-6 p-5 sm:p-8">
        <StepIndicator current={step} />

        {step === 1 ? (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm font-medium tracking-wide text-secondary uppercase">
              Desapegue conosco
            </p>
            <h1
              id={headingId}
              className="font-heading text-3xl font-extrabold text-balance text-foreground sm:text-4xl"
            >
              Seus filhos cresceram. As peças merecem um novo lar.
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Venda ou troque com a gente em 4 passos simples.
            </p>
            <p className="text-sm text-muted-foreground">
              A {storeName} recebe peças infantis em bom estado. Você preenche
              o formulário, envia algumas fotos e fala com a gente no WhatsApp
              — sem burocracia.
            </p>
            <Button
              size="lg"
              className="h-12 w-full text-base sm:w-auto"
              onClick={() => setStep(2)}
            >
              Quero desapegar
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-2 duration-300">
            <header className="flex flex-col gap-1">
              <h1
                id={headingId}
                className="font-heading text-2xl font-extrabold text-foreground"
              >
                Seus dados
              </h1>
              <p className="text-sm text-muted-foreground">
                Para a gente entrar em contato sobre as peças.
              </p>
            </header>

            <div className="flex flex-col gap-4">
              <Field
                label="Nome"
                htmlFor="fullName"
                error={fieldErrors.fullName}
              >
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  placeholder="Seu nome completo"
                  className="h-11"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                />
              </Field>

              <Field
                label="Telefone / WhatsApp"
                htmlFor="phone"
                error={fieldErrors.phone}
              >
                <PhoneInput
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onValueChange={(digits) => updateField("phone", digits)}
                  placeholder="(45) 99999-9999"
                  className="h-11"
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
              </Field>

              <Field
                label="E-mail (opcional)"
                htmlFor="email"
                error={fieldErrors.email}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="h-11"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
              </Field>
            </div>

            <StepNav
              onBack={() => setStep(1)}
              onNext={() => {
                if (validateStep2()) setStep(3);
              }}
              nextLabel="Continuar"
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-2 duration-300">
            <header className="flex flex-col gap-1">
              <h1
                id={headingId}
                className="font-heading text-2xl font-extrabold text-foreground"
              >
                Sobre as peças
              </h1>
              <p className="text-sm text-muted-foreground">
                Conte o que você tem e como prefere entregar.
              </p>
            </header>

            <div className="flex flex-col gap-4">
              <Field
                label="Quantidade estimada"
                htmlFor="itemCount"
                error={fieldErrors.itemCount}
              >
                <Input
                  id="itemCount"
                  name="itemCount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  value={form.itemCount}
                  onChange={(event) => updateField("itemCount", event.target.value)}
                  placeholder="Ex.: 12"
                  className="h-11"
                  aria-invalid={Boolean(fieldErrors.itemCount)}
                />
              </Field>

              <Field
                label="Descrição"
                htmlFor="description"
                error={fieldErrors.description}
              >
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Marcas, tamanhos, estado das peças…"
                  className="min-h-28 text-base md:text-sm"
                  aria-invalid={Boolean(fieldErrors.description)}
                />
              </Field>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Preferência de entrega</legend>
                <div className="grid gap-2">
                  {(
                    Object.keys(PREFERRED_METHODS) as PreferredMethod[]
                  ).map((method) => {
                    const selected = form.preferredMethod === method;
                    return (
                      <label
                        key={method}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                          selected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background hover:bg-muted/60",
                        )}
                      >
                        <input
                          type="radio"
                          name="preferredMethod"
                          value={method}
                          checked={selected}
                          onChange={() => updateField("preferredMethod", method)}
                          className="size-4 accent-[hsl(210_77%_37%)]"
                        />
                        <span className="font-medium">
                          {PREFERRED_METHOD_LABELS[method]}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {fieldErrors.preferredMethod ? (
                  <p role="alert" className="text-sm text-destructive">
                    {fieldErrors.preferredMethod}
                  </p>
                ) : null}
              </fieldset>

              <div className="flex flex-col gap-2">
                <Label>Fotos (até {MAX_INTAKE_PHOTOS})</Label>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={onDrop}
                  className={cn(
                    "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/40 hover:bg-muted/70",
                    (isUploading || photos.length >= MAX_INTAKE_PHOTOS) &&
                      "pointer-events-none opacity-60",
                  )}
                  aria-label="Enviar fotos por toque ou arrastar e soltar"
                >
                  {isUploading ? (
                    <Loader2 className="size-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="size-8 text-primary" />
                  )}
                  <p className="text-sm font-medium text-foreground">
                    Toque para escolher ou arraste as fotos aqui
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, WEBP ou AVIF · máx. 8MB cada
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="sr-only"
                    onChange={onFileInputChange}
                    disabled={isUploading || photos.length >= MAX_INTAKE_PHOTOS}
                  />
                </div>

                {uploadError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {uploadError}
                  </p>
                ) : null}

                {photos.length > 0 ? (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {photos.map((photo) => (
                      <li
                        key={photo.id}
                        className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                      >
                        <Image
                          src={photo.previewUrl}
                          alt="Foto enviada"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-foreground/80 text-background"
                          aria-label="Remover foto"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                    {photos.length < MAX_INTAKE_PHOTOS ? (
                      <li className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                        <ImagePlus className="size-5" aria-hidden />
                        <span className="sr-only">
                          Espaço para mais fotos
                        </span>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            </div>

            {submitError ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {submitError}
              </p>
            ) : null}

            <StepNav
              onBack={() => setStep(2)}
              onNext={() => void handleSubmitStep3()}
              nextLabel={isSubmitting ? "Enviando…" : "Enviar e continuar"}
              nextDisabled={isSubmitting || isUploading}
              nextPending={isSubmitting}
            />
          </div>
        ) : null}

        {step === 4 && confirmation ? (
          <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary/15 text-secondary">
              <Check className="size-6" aria-hidden />
            </div>
            <header className="flex flex-col gap-1">
              <h1
                id={headingId}
                className="font-heading text-2xl font-extrabold text-foreground"
              >
                Pronto! Agora é só mandar no WhatsApp
              </h1>
              <p className="text-sm text-muted-foreground">
                Recebemos seus dados. Toque no botão abaixo para abrir a
                conversa já com a mensagem preenchida.
              </p>
            </header>

            <blockquote className="rounded-2xl border border-border bg-muted/50 p-4 text-sm whitespace-pre-wrap text-foreground">
              {confirmation.message}
            </blockquote>

            <Button
              asChild
              size="lg"
              className="h-12 w-full bg-[#25D366] text-base text-white hover:bg-[#1ebe5d] sm:w-auto"
            >
              <a
                href={confirmation.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Enviar pelo WhatsApp
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progresso do formulário">
      {([1, 2, 3, 4] as const).map((value) => {
        const done = value < current;
        const active = value === current;
        return (
          <li key={value} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                done && "bg-secondary text-secondary-foreground",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : value}
            </span>
            {value < 4 ? (
              <span
                aria-hidden
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  value < current ? "bg-secondary" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  nextPending,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextPending?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full sm:w-auto"
        onClick={onBack}
        disabled={nextPending}
      >
        Voltar
      </Button>
      <Button
        type="button"
        className="h-11 w-full sm:w-auto"
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextPending ? (
          <>
            <Loader2 className="animate-spin" />
            {nextLabel}
          </>
        ) : (
          nextLabel
        )}
      </Button>
    </div>
  );
}
