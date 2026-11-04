import { createAdminClient } from "@/lib/supabase/admin";
import { loadTeamsAlertSettings } from "@/lib/teams-settings";
import TeamsSettingsForm from "./settings-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamsAlertsPage() {
  const supabase = createAdminClient();
  const settings = await loadTeamsAlertSettings(supabase);

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="kicker">Interaction in the team&apos;s natural habitat</div>
        <h1>Teams alert preferences</h1>
        <div className="subtitle">
          Decide when StockDetective should interrupt staff and exactly what evidence, explanation and action should appear in the Teams message.
        </div>
      </section>

      <TeamsSettingsForm initial={settings} />
    </div>
  );
}
