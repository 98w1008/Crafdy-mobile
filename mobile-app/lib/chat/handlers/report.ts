import { SupabaseClient } from '@supabase/supabase-js'

export type DraftWorker = { worker_id: string; man_day: 1 | 0.5 }

export async function commitReportDraft(
  supabase: SupabaseClient,
  { siteId, workDate, workers }: { siteId: string; workDate: string; workers: DraftWorker[] }
) {
  // 1) reports upsert (project_idベースに整合)
  let reportId: string | null = null
  // try select existing
  {
    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('project_id', siteId)
      .eq('work_date', workDate)
      .maybeSingle()
    if (error) {
      // continue insert path
    } else if (data?.id) {
      reportId = data.id
    }
  }
  if (!reportId) {
    const { data, error } = await supabase
      .from('reports')
      .insert({ project_id: siteId, work_date: workDate })
      .select('id')
      .single()
    if (error) throw error
    reportId = data.id
  }
  if (!reportId) throw new Error('report_insert_failed')

  // 2) rates -> labor_entries upsert
  let totalManDay = 0
  for (const w of workers) {
    totalManDay += w.man_day
    // rate resolve: site > company
    let daily = 0
    // site scope
    const { data: siteRate } = await supabase
      .from('worker_rates')
      .select('daily_rate, effective_from, scope, site_id')
      .eq('worker_id', w.worker_id)
      .eq('scope', 'site')
      .eq('site_id', siteId)
      .lte('effective_from', workDate)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (siteRate?.daily_rate) {
      daily = siteRate.daily_rate
    } else {
      const { data: compRate } = await supabase
        .from('worker_rates')
        .select('daily_rate, effective_from, scope')
        .eq('worker_id', w.worker_id)
        .eq('scope', 'company')
        .lte('effective_from', workDate)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (compRate?.daily_rate) daily = compRate.daily_rate
    }

    // upsert labor_entries by (site_id, worker_id, date)
    const row = {
      report_id: reportId,
      site_id: siteId,
      worker_id: w.worker_id,
      date: workDate,
      unit: w.man_day,
      daily_rate_at_entry: daily,
    }
    const { error: upErr } = await supabase
      .from('labor_entries')
      .upsert(row as any, { onConflict: 'site_id,worker_id,date' })
    if (upErr) throw upErr
  }

  return { reportId, totalManDay }
}

