\set QUIET on
\pset tuples_only on
\pset format unaligned
CREATE TEMP TABLE IF NOT EXISTS r(k text, v text);
GRANT ALL ON r TO authenticated, anon;
TRUNCATE r;
-- afviklet vagt (i går) for medarbejder c2, oprettet som superuser
DO $$ BEGIN
  IF to_regclass('public.care_staff_shifts') IS NOT NULL THEN
    EXECUTE $q$INSERT INTO care_staff_shifts (id, org_id, staff_id, shift_date, shift_type, start_time, end_time) VALUES ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c2', current_date - 1, 'dag', '07:30', '15:30')$q$;
  END IF;
END $$;
SET ROLE authenticated;
-- medarbejder in org1 tries to give their role manage_roles
SET test.uid = '00000000-0000-0000-0000-0000000000c2';
DO $$ DECLARE n int; BEGIN
  BEGIN UPDATE org_roles SET permissions = '{manage_roles}' WHERE id='00000000-0000-0000-0000-0000000000d1'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('medarbejder_escalate_role', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('medarbejder_escalate_role','blocked'); END;
  BEGIN UPDATE org_roles SET permissions = '{view_dashboard}' WHERE id='00000000-0000-0000-0000-0000000000d1'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN DELETE FROM journal_entries; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('staff_delete_journal', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('staff_delete_journal','blocked'); END;
  BEGIN UPDATE resident_sessions SET session_token_hash='attacker'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('staff_rewrite_session_hash', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('staff_rewrite_session_hash','blocked'); END;
  BEGIN UPDATE lys_safety_events SET risk_level='none'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('staff_wipe_safety_risk', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('staff_wipe_safety_risk','blocked'); END;
  BEGIN UPDATE lys_safety_events SET acknowledged_at=now(); GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('staff_ack_safety (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('staff_ack_safety (should work)','BROKEN'); END;
  BEGIN UPDATE plan_proposals SET status='approved'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('medarbejder_approve_plan', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('medarbejder_approve_plan','blocked'); END;
  BEGIN PERFORM create_audit_log('care_staff','forged'); INSERT INTO r VALUES ('client_audit_rpc','HOLE'); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('client_audit_rpc','blocked'); END;
  BEGIN INSERT INTO daily_plans (resident_id, org_id) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1'); INSERT INTO r VALUES ('own_org_plan_insert (should work)','works'); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('own_org_plan_insert (should work)','BROKEN'); END;
END $$;
-- vagtoverlevering (bølge 2): medarbejder skriver for egen borger
DO $$ BEGIN
  IF to_regclass('public.care_handover_notes') IS NOT NULL THEN
    BEGIN
      INSERT INTO care_handover_notes (resident_id, org_id, shift_label, shift_date, body) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','dag', current_date, 'Rolig dag');
      INSERT INTO r VALUES ('handover_write_own (should work)','works');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('handover_write_own (should work)','BROKEN'); END;
    BEGIN
      INSERT INTO care_handover_notes (resident_id, org_id, shift_label, shift_date, body) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a2','aften', current_date, 'forkert org');
      INSERT INTO r VALUES ('handover_wrong_org_id','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('handover_wrong_org_id','blocked'); END;
  END IF;
END $$;
-- medicinudlevering (bølge 2)
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.medication_administrations') IS NOT NULL THEN
    BEGIN
      INSERT INTO medication_administrations (resident_id, medication_id, org_id, scheduled_date, given_by) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1', current_date, '00000000-0000-0000-0000-0000000000c2');
      INSERT INTO r VALUES ('med_give (should work)','works');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('med_give (should work)','BROKEN'); END;
    BEGIN
      INSERT INTO medication_administrations (resident_id, medication_id, org_id, scheduled_date, given_by) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1', current_date, '00000000-0000-0000-0000-0000000000c2');
      INSERT INTO r VALUES ('med_double_dose_same_day','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('med_double_dose_same_day','blocked'); END;
    BEGIN
      INSERT INTO medication_administrations (resident_id, medication_id, org_id, scheduled_date, given_by) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1', current_date + 1, '00000000-0000-0000-0000-0000000000c1');
      INSERT INTO r VALUES ('med_spoof_given_by','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('med_spoof_given_by','blocked'); END;
    BEGIN UPDATE medication_administrations SET given_at = now() - interval '3 hours'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('med_backdate', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('med_backdate','blocked'); END;
    BEGIN DELETE FROM medication_administrations; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('med_delete', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('med_delete','blocked'); END;
    BEGIN
      UPDATE medication_administrations SET cancelled_at = now(), cancelled_by = '00000000-0000-0000-0000-0000000000c2' WHERE cancelled_at IS NULL; GET DIAGNOSTICS n = ROW_COUNT;
      INSERT INTO medication_administrations (resident_id, medication_id, org_id, scheduled_date, given_by) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1', current_date, '00000000-0000-0000-0000-0000000000c2');
      INSERT INTO r VALUES ('med_cancel_then_regive (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END);
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('med_cancel_then_regive (should work)','BROKEN'); END;
  END IF;
END $$;
-- magtanvendelse / indsatsdokumentation (bølge 2): juridisk spor, kun opret og læs
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.care_indsats_records') IS NOT NULL THEN
    BEGIN
      INSERT INTO care_indsats_records (org_id, type, tidspunkt, involverede_borgere, beskrivelse, underskrift) VALUES ('00000000-0000-0000-0000-0000000000a1','§136_fastholdelse','2026-10-13T14:00','Sara K.','Fastholdelse','LN');
      INSERT INTO r VALUES ('indsats_create (should work)','works');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('indsats_create (should work)','BROKEN'); END;
    BEGIN
      INSERT INTO care_indsats_records (org_id, type, tidspunkt, involverede_borgere, beskrivelse, underskrift, created_by) VALUES ('00000000-0000-0000-0000-0000000000a1','hændelse','2026-10-13T14:00','Sara K.','x','LN','00000000-0000-0000-0000-0000000000c1');
      INSERT INTO r VALUES ('indsats_spoof_created_by','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('indsats_spoof_created_by','blocked'); END;
    BEGIN
      INSERT INTO care_indsats_records (org_id, type, tidspunkt, involverede_borgere, beskrivelse, underskrift) VALUES ('00000000-0000-0000-0000-0000000000a2','hændelse','2026-10-13T14:00','x','x','LN');
      INSERT INTO r VALUES ('indsats_other_org_insert','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('indsats_other_org_insert','blocked'); END;
    SELECT count(*) INTO n FROM care_indsats_records; INSERT INTO r VALUES ('indsats_read (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END);
    BEGIN UPDATE care_indsats_records SET beskrivelse = 'omskrevet'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('indsats_rewrite', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('indsats_rewrite','blocked'); END;
    BEGIN DELETE FROM care_indsats_records; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('indsats_delete', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('indsats_delete','blocked'); END;
  END IF;
END $$;
-- opgaver (bølge 2)
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.care_staff_tasks') IS NOT NULL THEN
    BEGIN
      INSERT INTO care_staff_tasks (org_id, resident_id, title, deadline) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','Ring til læge', current_date);
      INSERT INTO r VALUES ('task_create (should work)','works');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('task_create (should work)','BROKEN'); END;
    BEGIN UPDATE care_staff_tasks SET status = 'afsluttet'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('task_complete (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('task_complete (should work)','BROKEN'); END;
    BEGIN UPDATE care_staff_tasks SET created_by = '00000000-0000-0000-0000-0000000000c1'; SELECT count(*) INTO n FROM care_staff_tasks WHERE created_by = '00000000-0000-0000-0000-0000000000c1'; INSERT INTO r VALUES ('task_rewrite_author', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('task_rewrite_author','blocked'); END;
    BEGIN
      INSERT INTO care_staff_tasks (org_id, resident_id, title, deadline) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b2','andens borger', current_date);
      INSERT INTO r VALUES ('task_other_org_resident','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('task_other_org_resident','blocked'); END;
    BEGIN DELETE FROM care_staff_tasks; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('task_delete', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('task_delete','blocked'); END;
  END IF;
END $$;
-- behovsmedicin (bølge 3): flere doser pr. dag med begrundelse
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.medication_prn_administrations') IS NOT NULL THEN
    BEGIN
      INSERT INTO medication_prn_administrations (resident_id, medication_id, org_id, reason) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1','Uro');
      INSERT INTO medication_prn_administrations (resident_id, medication_id, org_id, reason) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1','Uro igen');
      INSERT INTO r VALUES ('prn_give_twice (should work)','works');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_give_twice (should work)','BROKEN'); END;
    BEGIN
      INSERT INTO medication_prn_administrations (resident_id, medication_id, org_id, reason) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1','  ');
      INSERT INTO r VALUES ('prn_without_reason','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_without_reason','blocked'); END;
    BEGIN
      INSERT INTO medication_prn_administrations (resident_id, medication_id, org_id, reason) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1','x');
      INSERT INTO r VALUES ('prn_on_fixed_med','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_on_fixed_med','blocked'); END;
    BEGIN
      INSERT INTO medication_prn_administrations (resident_id, medication_id, org_id, reason, given_at) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1','x', now() - interval '3 hours');
      INSERT INTO r VALUES ('prn_backdate','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_backdate','blocked'); END;
    BEGIN
      INSERT INTO medication_administrations (resident_id, medication_id, org_id, scheduled_date, given_by) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1', current_date, '00000000-0000-0000-0000-0000000000c2');
      INSERT INTO r VALUES ('fixed_receipt_on_prn_med','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('fixed_receipt_on_prn_med','blocked'); END;
    BEGIN UPDATE medication_prn_administrations SET effect = 'Faldt til ro' WHERE reason = 'Uro'; GET DIAGNOSTICS n = ROW_COUNT;
      SELECT count(*) INTO n FROM medication_prn_administrations WHERE effect_noted_by = '00000000-0000-0000-0000-0000000000c2';
      INSERT INTO r VALUES ('prn_note_effect (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END);
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_note_effect (should work)','BROKEN'); END;
    BEGIN UPDATE medication_prn_administrations SET effect = 'omskrevet' WHERE reason = 'Uro'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('prn_rewrite_effect', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_rewrite_effect','blocked'); END;
    BEGIN UPDATE medication_prn_administrations SET reason = 'andet'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('prn_rewrite_reason', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_rewrite_reason','blocked'); END;
    BEGIN UPDATE medication_prn_administrations SET cancelled_at = now(), cancelled_by = '00000000-0000-0000-0000-0000000000c1' WHERE reason = 'Uro igen';
      SELECT count(*) INTO n FROM medication_prn_administrations WHERE cancelled_by = '00000000-0000-0000-0000-0000000000c2';
      INSERT INTO r VALUES ('prn_cancel_as_self (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END);
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_cancel_as_self (should work)','BROKEN'); END;
    BEGIN DELETE FROM medication_prn_administrations; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('prn_delete', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('prn_delete','blocked'); END;
  END IF;
END $$;
-- gæst i org1 må læse, ikke skrive
SET test.uid = '00000000-0000-0000-0000-0000000000c4';
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.care_handover_notes') IS NOT NULL THEN
    SELECT count(*) INTO n FROM care_handover_notes; INSERT INTO r VALUES ('handover_guest_read (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END);
    BEGIN
      INSERT INTO care_handover_notes (resident_id, org_id, shift_label, shift_date, body) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','nat', current_date, 'gæst');
      INSERT INTO r VALUES ('handover_guest_write','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('handover_guest_write','blocked'); END;
  END IF;
  IF to_regclass('public.care_indsats_records') IS NOT NULL THEN
    BEGIN
      EXECUTE $q$INSERT INTO care_indsats_records (org_id, type, tidspunkt, involverede_borgere, beskrivelse, underskrift) VALUES ('00000000-0000-0000-0000-0000000000a1','hændelse','2026-10-13T14:00','x','x','G')$q$;
      INSERT INTO r VALUES ('indsats_guest_write','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('indsats_guest_write','blocked'); END;
  END IF;
END $$;
-- leder in org2 (other tenant)
SET test.uid = '00000000-0000-0000-0000-0000000000c3';
DO $$ DECLARE n int; BEGIN
  BEGIN INSERT INTO daily_plans (resident_id, org_id) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1'); INSERT INTO r VALUES ('other_org_plan_insert','HOLE'); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('other_org_plan_insert','blocked'); END;
  SELECT count(*) INTO n FROM daily_plans; INSERT INTO r VALUES ('other_org_plan_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  BEGIN INSERT INTO resident_plan_items (resident_id, org_id, staff_suggestion) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1', true); INSERT INTO r VALUES ('other_org_plan_item_insert','HOLE'); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('other_org_plan_item_insert','blocked'); END;
  BEGIN UPDATE plan_proposals SET status='rejected'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('other_org_review_proposal', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('other_org_review_proposal','blocked'); END;
  IF to_regclass('public.care_handover_notes') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM care_handover_notes' INTO n; INSERT INTO r VALUES ('handover_other_org_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
  IF to_regclass('public.medication_administrations') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM medication_administrations' INTO n; INSERT INTO r VALUES ('med_other_org_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
  IF to_regclass('public.medication_prn_administrations') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM medication_prn_administrations' INTO n; INSERT INTO r VALUES ('prn_other_org_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
  IF to_regclass('public.care_staff_tasks') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM care_staff_tasks' INTO n; INSERT INTO r VALUES ('task_other_org_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
  IF to_regclass('public.care_indsats_records') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM care_indsats_records' INTO n; INSERT INTO r VALUES ('indsats_other_org_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
END $$;
-- vagtplan (bølge 4): egne vagter fra i dag og frem
SET test.uid = '00000000-0000-0000-0000-0000000000c2';
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.care_staff_shifts') IS NOT NULL THEN
    BEGIN
      INSERT INTO care_staff_shifts (org_id, staff_id, shift_date, shift_type, start_time, end_time) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c2', current_date + 1, 'aften', '15:00', '23:00');
      INSERT INTO r VALUES ('shift_claim_own (should work)','works');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_claim_own (should work)','BROKEN'); END;
    BEGIN
      INSERT INTO care_staff_shifts (org_id, staff_id, shift_date, shift_type, start_time, end_time) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c4', current_date + 1, 'aften', '15:00', '23:00');
      INSERT INTO r VALUES ('shift_claim_for_colleague','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_claim_for_colleague','blocked'); END;
    BEGIN
      INSERT INTO care_staff_shifts (org_id, staff_id, shift_date, shift_type, start_time, end_time) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c2', current_date - 3, 'nat', '23:00', '07:00');
      INSERT INTO r VALUES ('shift_backdate_claim','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_backdate_claim','blocked'); END;
    BEGIN
      INSERT INTO care_staff_shifts (org_id, staff_id, shift_date, shift_type, start_time, end_time) VALUES ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000c2', current_date + 2, 'dag', '07:30', '15:30');
      INSERT INTO r VALUES ('shift_wrong_org','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_wrong_org','blocked'); END;
    BEGIN EXECUTE 'UPDATE care_staff_shifts SET hours = 20'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('shift_edit_hours', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_edit_hours','blocked'); END;
    BEGIN EXECUTE $q$DELETE FROM care_staff_shifts WHERE id = '00000000-0000-0000-0000-0000000000f1'$q$; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('shift_delete_past', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_delete_past','blocked'); END;
    BEGIN EXECUTE 'DELETE FROM care_staff_shifts WHERE shift_date > current_date'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('shift_drop_own_future (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_drop_own_future (should work)','BROKEN'); END;
  END IF;
END $$;
SET test.uid = '00000000-0000-0000-0000-0000000000c3';
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.care_staff_shifts') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM care_staff_shifts' INTO n; INSERT INTO r VALUES ('shift_other_org_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.care_staff_shifts') IS NOT NULL THEN
    BEGIN EXECUTE 'SELECT count(*) FROM care_staff_shifts' INTO n; INSERT INTO r VALUES ('shift_anon_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('shift_anon_read','blocked'); END;
  END IF;
  BEGIN PERFORM award_xp('00000000-0000-0000-0000-0000000000b1', 'journal', 9999); INSERT INTO r VALUES ('anon_award_xp','HOLE'); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('anon_award_xp','blocked'); END;
END $$;
RESET ROLE;
SET ROLE authenticated;
-- VUM 2.0 (bølge 4)
SET test.uid = '00000000-0000-0000-0000-0000000000c2';
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.vum_assessments') IS NOT NULL THEN
    BEGIN
      EXECUTE $q$INSERT INTO vum_assessments (id, org_id, resident_id) VALUES ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1')$q$;
      INSERT INTO r VALUES ('vum_create_own (should work)','works');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_create_own (should work)','BROKEN'); END;
    BEGIN
      EXECUTE $q$INSERT INTO vum_assessments (org_id, resident_id) VALUES ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b2')$q$;
      INSERT INTO r VALUES ('vum_create_other_org','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_create_other_org','blocked'); END;
    BEGIN
      EXECUTE $q$INSERT INTO vum_assessments (org_id, resident_id) VALUES ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b1')$q$;
      INSERT INTO r VALUES ('vum_wrong_org_id','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_wrong_org_id','blocked'); END;
    BEGIN EXECUTE $q$UPDATE vum_assessments SET theme_2_mental = '{"notes":"Bedre søvn"}'$q$; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('vum_edit_theme (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_edit_theme (should work)','BROKEN'); END;
    BEGIN EXECUTE $q$UPDATE vum_assessments SET resident_id = '00000000-0000-0000-0000-0000000000b2'$q$; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('vum_move_resident', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_move_resident','blocked'); END;
    BEGIN EXECUTE 'DELETE FROM vum_assessments'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('vum_delete', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_delete','blocked'); END;
    BEGIN EXECUTE $q$UPDATE vum_assessments SET status = 'archived'$q$; EXCEPTION WHEN others THEN NULL; END;
    BEGIN EXECUTE $q$UPDATE vum_assessments SET case_purpose = 'ændret efter arkivering'$q$; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('vum_edit_archived', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_edit_archived','blocked'); END;
  END IF;
END $$;
SET test.uid = '00000000-0000-0000-0000-0000000000c4';
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.vum_assessments') IS NOT NULL THEN
    BEGIN
      EXECUTE $q$INSERT INTO vum_assessments (org_id, resident_id) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1')$q$;
      INSERT INTO r VALUES ('vum_create_without_permission','HOLE');
    EXCEPTION WHEN others THEN INSERT INTO r VALUES ('vum_create_without_permission','blocked'); END;
    EXECUTE 'SELECT count(*) FROM vum_assessments' INTO n; INSERT INTO r VALUES ('vum_read_without_view_360', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
END $$;
SET test.uid = '00000000-0000-0000-0000-0000000000c3';
DO $$ DECLARE n int; BEGIN
  IF to_regclass('public.vum_assessments') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM vum_assessments' INTO n; INSERT INTO r VALUES ('vum_other_org_read', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END);
  END IF;
END $$;
-- bølge 5: ingen hard-delete af kliniske data
SET test.uid = '00000000-0000-0000-0000-0000000000c1';
DO $$ DECLARE n int; BEGIN
  BEGIN DELETE FROM crisis_alerts; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('staff_delete_crisis_alert', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('staff_delete_crisis_alert','blocked'); END;
  BEGIN DELETE FROM resident_medications WHERE id = '00000000-0000-0000-0000-0000000000e1'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('staff_delete_medication', CASE WHEN n>0 THEN 'HOLE' ELSE 'blocked' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('staff_delete_medication','blocked'); END;
  SELECT count(*) INTO n FROM crisis_alerts; INSERT INTO r VALUES ('staff_read_crisis_alert (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END);
END $$;
-- leder in org1 can still manage roles
SET test.uid = '00000000-0000-0000-0000-0000000000c1';
DO $$ DECLARE n int; BEGIN
  BEGIN UPDATE org_roles SET name='medarbejder' WHERE id='00000000-0000-0000-0000-0000000000d1'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('leder_manage_roles (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('leder_manage_roles (should work)','BROKEN'); END;
  BEGIN UPDATE organisations SET name='Org1' WHERE id='00000000-0000-0000-0000-0000000000a1'; GET DIAGNOSTICS n = ROW_COUNT; INSERT INTO r VALUES ('leder_org_settings (should work)', CASE WHEN n>0 THEN 'works' ELSE 'BROKEN' END); EXCEPTION WHEN others THEN INSERT INTO r VALUES ('leder_org_settings (should work)','BROKEN'); END;
END $$;
RESET ROLE;
SELECT k || ': ' || v FROM r;
