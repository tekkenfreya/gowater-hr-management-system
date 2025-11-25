-- =====================================================
-- FIX execute_sql TO HANDLE PARAMETERS
-- =====================================================
-- This version properly handles parameterized queries
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
  param_count int;
  i int;
  query_with_values text;
BEGIN
  -- Get parameter count
  param_count := jsonb_array_length(params);

  -- If no parameters, execute directly
  IF param_count = 0 THEN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query)
    INTO result_json;
  ELSE
    -- Replace $1, $2, etc. with actual values
    query_with_values := query;

    FOR i IN 1..param_count LOOP
      query_with_values := replace(
        query_with_values,
        '$' || i::text,
        quote_literal(params->>(i-1))
      );
    END LOOP;

    -- Execute query with replaced parameters
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_with_values)
    INTO result_json;
  END IF;

  -- Return empty array if no results
  IF result_json IS NULL THEN
    result_json := '[]'::jsonb;
  END IF;

  RETURN result_json;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL Execution Error: % - % (Query: %)', SQLSTATE, SQLERRM, query;
END;
$$;

-- Recreate grants (just in case)
GRANT EXECUTE ON FUNCTION public.execute_sql(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_sql(text, jsonb) TO anon;

-- =====================================================
-- TEST THE FUNCTION WITH PARAMETERS
-- =====================================================
-- Test without parameters:
-- SELECT execute_sql('SELECT * FROM users LIMIT 2');

-- Test with parameters:
-- SELECT execute_sql(
--   'SELECT * FROM attendance WHERE date >= $1 AND date <= $2 LIMIT 5',
--   '["2025-11-20", "2025-11-24"]'::jsonb
-- );
