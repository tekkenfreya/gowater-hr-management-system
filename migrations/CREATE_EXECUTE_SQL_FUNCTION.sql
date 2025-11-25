-- =====================================================
-- CREATE execute_sql FUNCTION FOR SUPABASE
-- =====================================================
-- This function allows the application to execute raw SQL
-- Required for executeRawSQL() method to work
-- =====================================================

CREATE OR REPLACE FUNCTION public.execute_sql(
  query text,
  params jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_json jsonb;
BEGIN
  -- Build and execute dynamic SQL
  -- Convert params array to individual parameters
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query)
  INTO result_json;

  -- Return empty array if no results
  IF result_json IS NULL THEN
    result_json := '[]'::jsonb;
  END IF;

  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL Execution Error: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.execute_sql(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_sql(text, jsonb) TO anon;

-- Add documentation
COMMENT ON FUNCTION public.execute_sql(text, jsonb) IS
'Executes raw SQL queries and returns results as JSONB array. Used by executeRawSQL() in the application.';

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Test the function:
-- SELECT execute_sql('SELECT * FROM users LIMIT 5');
-- SELECT execute_sql('SELECT COUNT(*) as total FROM attendance');
