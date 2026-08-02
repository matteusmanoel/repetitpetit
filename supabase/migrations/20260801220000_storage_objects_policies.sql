-- Repeti Petit — Políticas explícitas de storage.objects
-- Ref.: docs/09-decisions.md D24 (ticket T04), formalizado em D27
--
-- Os buckets product-images/intake-photos já existem com public = true, o que
-- permite leitura anônima da URL pública via API de Storage (independente de
-- RLS). Sem nenhuma policy em storage.objects, INSERT/UPDATE/DELETE já ficam
-- bloqueados por padrão para anon/authenticated (RLS nega tudo, service_role
-- ignora RLS). Esta migration apenas torna essa postura EXPLÍCITA e auditável
-- em vez de depender do comportamento padrão implícito.

CREATE POLICY "product_images_public_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "intake_photos_public_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'intake-photos');

CREATE POLICY "product_images_service_role_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "intake_photos_service_role_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'intake-photos') WITH CHECK (bucket_id = 'intake-photos');
