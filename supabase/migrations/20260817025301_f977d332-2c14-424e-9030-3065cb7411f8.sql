CREATE OR REPLACE FUNCTION public.render_ativos()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  a record;
  d date;
  taxa_ano numeric;
  taxa_dia numeric;
  saldo numeric;
  juros numeric;
  dias integer := 0;
BEGIN
  FOR a IN SELECT * FROM public.ativos WHERE rende LOOP
    taxa_ano := CASE WHEN a.modo_taxa = 'fixa' THEN a.taxa_aa ELSE a.cdi_aa * a.pct_cdi / 100 END;
    IF taxa_ano IS NULL OR taxa_ano <= 0 THEN CONTINUE; END IF;
    taxa_dia := power(1 + taxa_ano / 100, 1.0 / 252) - 1;
    saldo := a.valor;
    d := a.ultimo_fechamento + 1;
    WHILE d <= CURRENT_DATE LOOP
      IF extract(isodow from d) < 6 THEN
        juros := round(saldo * taxa_dia, 2);
        INSERT INTO public.rendimentos (ativo_id, data, saldo_anterior, juros, saldo_final, origem)
        VALUES (a.id, d, saldo, juros, saldo + juros, 'automatico')
        ON CONFLICT (ativo_id, data) WHERE origem = 'automatico' DO NOTHING;
        saldo := saldo + juros;
        dias := dias + 1;
      END IF;
      d := d + 1;
    END LOOP;
    UPDATE public.ativos SET valor = saldo, ultimo_fechamento = CURRENT_DATE WHERE id = a.id;
  END LOOP;
  RETURN dias;
END;
$$;