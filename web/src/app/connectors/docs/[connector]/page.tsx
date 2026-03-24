import { notFound } from "next/navigation";

import { ConnectorDocsDetailPage } from "@/components/docs/connectors/ConnectorDocsExperience";
import { getConnectorDocsEntryBySlug } from "@/lib/connectors/docs";

export default async function Page(props: {
  params: Promise<{ connector: string }>;
}) {
  const params = await props.params;
  const entry = getConnectorDocsEntryBySlug(params.connector);

  if (!entry) {
    notFound();
  }

  return <ConnectorDocsDetailPage entry={entry} />;
}
