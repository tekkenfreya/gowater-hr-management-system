-- =====================================================
-- CREATE execute_sql FUNCTION
-- =====================================================
-- This function is required for executeRawSQL() to work
-- It allows the application to execute raw SQL queries
-- with parameterized queries
-- =====================================================

CREATE OR REPLACE FUNCTION public.execute_sql(query text, params text[] DEFAULT ARRAY[]::text[])
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return query results as JSONB rows
  RETURN QUERY EXECUTE query USING VARIADIC params;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.execute_sql(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql(text, text[]) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.execute_sql IS 'Executes raw SQL queries with parameters. Used by executeRawSQL() method in the application.';

-- Test the function (optional - remove these lines before production)
-- SELECT * FROM execute_sql('SELECT * FROM users LIMIT 5', ARRAY[]::text[]);
-- SELECT * FROM execute_sql('SELECT * FROM users WHERE id = $1', ARRAY['1']);
