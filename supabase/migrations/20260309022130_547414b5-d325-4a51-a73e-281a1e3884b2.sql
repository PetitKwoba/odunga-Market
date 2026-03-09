
-- Allow producers to manage their own discount codes
CREATE POLICY "Producers can manage their own discount codes"
ON public.discount_codes
FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to insert discount usage (needed at checkout)
CREATE POLICY "Authenticated users can insert discount usage"
ON public.discount_usage
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
