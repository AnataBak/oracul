-- handle_new_user используется только триггером on_auth_user_created.
-- Запрещаем его вызов как RPC-функции через REST API, чтобы линтер Supabase
-- не ругался на security definer-функцию, доступную для anon/authenticated.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
