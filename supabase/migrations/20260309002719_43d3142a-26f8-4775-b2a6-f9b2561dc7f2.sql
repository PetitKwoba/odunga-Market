-- Enable realtime for admin monitoring tables (excluding order_messages which is already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts;