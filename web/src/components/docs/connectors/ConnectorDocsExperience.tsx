"use client";

import Link from "next/link";
import type { Route } from "next";

import { Button } from "@opal/components";
import { SvgArrowLeft, SvgArrowRight } from "@opal/icons";

import { SourceIcon } from "@/components/SourceIcon";
import AppLanguageSelect from "@/components/i18n/AppLanguageSelect";
import { getSourceMetadata } from "@/lib/sources";
import { useAppLanguage } from "@/providers/AppLanguageProvider";
import Card from "@/refresh-components/cards/Card";
import Code from "@/refresh-components/Code";
import Text from "@/refresh-components/texts/Text";
import { Section } from "@/layouts/general-layouts";
import type {
  ConnectorDocsEntry,
  ConnectorDocsFaqItem,
  ConnectorDocsPoint,
  ConnectorDocsStep,
  LocalizedCopy,
} from "@/lib/connectors/docs";
import {
  getConnectorDocsEntries,
  getConnectorDocsIndexPath,
  getSourceCategoryCopy,
} from "@/lib/connectors/docs";
import { SourceCategory } from "@/lib/search/interfaces";

function localize(copy: LocalizedCopy, language: "en" | "es"): string {
  return copy[language];
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: LocalizedCopy;
  description?: LocalizedCopy;
}) {
  const { language } = useAppLanguage();

  return (
    <Section id={id} alignItems="start" gap={0.35}>
      <Text headingH2 as="p">
        {localize(title, language)}
      </Text>
      {description ? (
        <Text mainContentBody text03 as="p">
          {localize(description, language)}
        </Text>
      ) : null}
    </Section>
  );
}

function PointGrid({ items }: { items: ConnectorDocsPoint[] }) {
  const { language } = useAppLanguage();

  return (
    <div className="connector-docs-grid connector-docs-grid--two">
      {items.map((item) => (
        <Card
          key={`${localize(item.title, language)}-${localize(
            item.body,
            language
          )}`}
          variant="secondary"
          className="connector-docs-section-card"
        >
          <Section alignItems="start" gap={0.45}>
            <Text headingH3 as="p">
              {localize(item.title, language)}
            </Text>
            <Text mainContentBody text03 as="p">
              {localize(item.body, language)}
            </Text>
          </Section>
        </Card>
      ))}
    </div>
  );
}

function StepList({ steps }: { steps: ConnectorDocsStep[] }) {
  const { language } = useAppLanguage();

  return (
    <Section alignItems="start" gap={0.9}>
      {steps.map((step, index) => (
        <Card
          key={`${localize(step.title, language)}-${index}`}
          className="connector-docs-step-card"
        >
          <Section
            flexDirection="row"
            alignItems="start"
            justifyContent="start"
            gap={1}
          >
            <div className="connector-docs-step-number">{index + 1}</div>
            <Section alignItems="start" gap={0.45}>
              <Text headingH3 as="p">
                {localize(step.title, language)}
              </Text>
              <Text mainContentBody text03 as="p">
                {localize(step.body, language)}
              </Text>
              {step.fields?.length ? (
                <Section alignItems="start" gap={0.25}>
                  {step.fields.map((field) => (
                    <Text
                      key={localize(field, language)}
                      mainUiBody
                      text04
                      as="p"
                      className="connector-docs-inline-bullet"
                    >
                      {localize(field, language)}
                    </Text>
                  ))}
                </Section>
              ) : null}
            </Section>
          </Section>
        </Card>
      ))}
    </Section>
  );
}

function FaqList({ items }: { items: ConnectorDocsFaqItem[] }) {
  const { language } = useAppLanguage();

  return (
    <Section alignItems="start" gap={0.8}>
      {items.map((item) => (
        <Card
          key={localize(item.question, language)}
          variant="secondary"
          className="connector-docs-section-card"
        >
          <Section alignItems="start" gap={0.35}>
            <Text headingH3 as="p">
              {localize(item.question, language)}
            </Text>
            <Text mainContentBody text03 as="p">
              {localize(item.answer, language)}
            </Text>
          </Section>
        </Card>
      ))}
    </Section>
  );
}

export function ConnectorDocsIndexPage() {
  const { language } = useAppLanguage();
  const entries = getConnectorDocsEntries();
  const grouped = entries.reduce(
    (acc, entry) => {
      const category = getSourceMetadata(entry.source).category;
      acc[category] = [...(acc[category] || []), entry];
      return acc;
    },
    {} as Partial<Record<SourceCategory, ConnectorDocsEntry[]>>
  );

  return (
    <div className="connector-docs-shell">
      <div className="connector-docs-frame">
        <Card className="connector-docs-hero connector-docs-index-hero">
          <Section alignItems="start" gap={1.15}>
            <Section
              alignItems="center"
              gap={1}
              className="connector-docs-index-hero-header"
            >
              <Section
                alignItems="center"
                gap={0.45}
                className="connector-docs-index-hero-copy-block"
              >
                <Text mainUiAction text04 as="p">
                  {language === "es"
                    ? "Biblioteca de conectores"
                    : "Connector setup library"}
                </Text>
                <Text headingH1 as="p" className="connector-docs-hero-title">
                  {language === "es"
                    ? "Guías bilingües para cada integración soportada"
                    : "Bilingual guides for every supported integration"}
                </Text>
                <Text
                  mainContentBody
                  text03
                  as="p"
                  className="connector-docs-hero-copy"
                >
                  {language === "es"
                    ? "Estas páginas explican requisitos, permisos, pasos exactos, verificación y recuperación de errores para que un equipo pueda completar la conexión sin depender de soporte."
                    : "These pages explain requirements, permissions, exact setup steps, verification, and recovery paths so a team can complete the connection without waiting on support."}
                </Text>
              </Section>
              <div className="connector-docs-language connector-docs-language--centered">
                <AppLanguageSelect className="connector-docs-language-select" />
              </div>
            </Section>

            <div className="connector-docs-grid connector-docs-grid--three">
              <Card variant="secondary" className="connector-docs-summary-card">
                <Section alignItems="start" gap={0.2}>
                  <Text figureSmallLabel text02 as="p">
                    {language === "es" ? "Cobertura" : "Coverage"}
                  </Text>
                  <Text headingH3 as="p">
                    {entries.length}
                  </Text>
                  <Text mainUiBody text03 as="p">
                    {language === "es"
                      ? "páginas generadas desde los conectores soportados del producto"
                      : "pages generated from the product's supported connectors"}
                  </Text>
                </Section>
              </Card>
              <Card variant="secondary" className="connector-docs-summary-card">
                <Section alignItems="start" gap={0.2}>
                  <Text figureSmallLabel text02 as="p">
                    {language === "es" ? "Idiomas" : "Languages"}
                  </Text>
                  <Text headingH3 as="p">
                    ES / EN
                  </Text>
                  <Text mainUiBody text03 as="p">
                    {language === "es"
                      ? "un cambio de idioma impacta toda la biblioteca"
                      : "switching language updates the whole library"}
                  </Text>
                </Section>
              </Card>
              <Card variant="secondary" className="connector-docs-summary-card">
                <Section alignItems="start" gap={0.2}>
                  <Text figureSmallLabel text02 as="p">
                    {language === "es" ? "Notas" : "Notes"}
                  </Text>
                  <Text headingH3 as="p">
                    {language === "es" ? "Importante" : "Important"}
                  </Text>
                  <Text mainUiBody text03 as="p">
                    {language === "es"
                      ? "Google Calendar no aparece como conector soportado en este build y OneDrive personal se documenta dentro del flujo de SharePoint."
                      : "Google Calendar is not exposed as a supported connector in this build, and personal OneDrive is documented inside the SharePoint flow."}
                  </Text>
                </Section>
              </Card>
            </div>
          </Section>
        </Card>

        <Section
          alignItems="start"
          gap={1.25}
          className="connector-docs-groups"
        >
          {Object.entries(grouped).map(([category, categoryEntries]) => {
            const typedCategory = category as SourceCategory;
            const entriesInCategory = (categoryEntries || []).sort(
              (left, right) =>
                getSourceMetadata(left.source).displayName.localeCompare(
                  getSourceMetadata(right.source).displayName
                )
            );

            return (
              <Section
                key={category}
                alignItems="start"
                gap={0.7}
                className="connector-docs-category-section"
              >
                <Section
                  alignItems="center"
                  gap={0.25}
                  className="connector-docs-category-header"
                >
                  <Text headingH2 as="p">
                    {localize(getSourceCategoryCopy(typedCategory), language)}
                  </Text>
                  <Text mainContentBody text03 as="p">
                    {language === "es"
                      ? "Abre una guía para ver prerequisitos, configuración, permisos y troubleshooting."
                      : "Open any guide to see prerequisites, setup, permissions, and troubleshooting."}
                  </Text>
                </Section>

                <div className="connector-docs-grid connector-docs-grid--cards">
                  {entriesInCategory.map((entry) => {
                    const sourceMetadata = getSourceMetadata(entry.source);

                    return (
                      <Link
                        key={entry.source}
                        href={
                          `${getConnectorDocsIndexPath()}/${
                            entry.slug
                          }` as Route
                        }
                        className="connector-docs-card-link"
                      >
                        <Card className="connector-docs-source-card">
                          <Section alignItems="start" gap={0.8}>
                            <Section
                              flexDirection="row"
                              justifyContent="start"
                              alignItems="start"
                              width="full"
                              gap={0.75}
                              wrap
                            >
                              <div className="connector-docs-source-icon">
                                <SourceIcon
                                  sourceType={entry.source}
                                  iconSize={24}
                                />
                              </div>
                              <div className="connector-docs-chip">
                                <Text secondaryAction text04 as="p">
                                  {localize(entry.authSummary, language)}
                                </Text>
                              </div>
                            </Section>

                            <Section alignItems="start" gap={0.25}>
                              <Text headingH3 as="p">
                                {sourceMetadata.displayName}
                              </Text>
                              <Text mainContentBody text03 as="p">
                                {localize(entry.tagline, language)}
                              </Text>
                            </Section>

                            <div className="connector-docs-source-footer">
                              <Text mainUiAction text04 as="p">
                                {language === "es"
                                  ? "Abrir guía"
                                  : "Open guide"}
                              </Text>
                              <SvgArrowRight className="connector-docs-link-icon" />
                            </div>
                          </Section>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </Section>
            );
          })}
        </Section>
      </div>
    </div>
  );
}

export function ConnectorDocsDetailPage({
  entry,
}: {
  entry: ConnectorDocsEntry;
}) {
  const { language } = useAppLanguage();
  const sourceMetadata = getSourceMetadata(entry.source);

  const navItems = [
    { id: "overview", label: language === "es" ? "Resumen" : "Overview" },
    {
      id: "before-you-start",
      label: language === "es" ? "Antes de empezar" : "Before you start",
    },
    { id: "setup", label: language === "es" ? "Pasos" : "Setup steps" },
    {
      id: "permissions",
      label: language === "es" ? "Permisos" : "Permissions",
    },
    { id: "mcp", label: language === "es" ? "MCP" : "MCP details" },
    {
      id: "verification",
      label: language === "es" ? "Verificación" : "Verification",
    },
    {
      id: "troubleshooting",
      label: language === "es" ? "Errores" : "Troubleshooting",
    },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="connector-docs-shell">
      <div className="connector-docs-frame">
        <Section alignItems="start" gap={1.1}>
          <Link
            href={getConnectorDocsIndexPath() as Route}
            className="connector-docs-back-link"
          >
            <SvgArrowLeft className="connector-docs-link-icon" />
            <Text mainUiAction text04 as="p">
              {language === "es"
                ? "Volver al índice de conectores"
                : "Back to connector docs"}
            </Text>
          </Link>

          <Card className="connector-docs-hero">
            <Section alignItems="start" gap={1}>
              <Section
                flexDirection="row"
                justifyContent="between"
                alignItems="start"
                width="full"
                gap={1}
                wrap
              >
                <Section alignItems="start" gap={0.55}>
                  <Section
                    flexDirection="row"
                    justifyContent="start"
                    alignItems="center"
                    gap={0.7}
                  >
                    <div className="connector-docs-source-icon connector-docs-source-icon--large">
                      <SourceIcon sourceType={entry.source} iconSize={28} />
                    </div>
                    <div className="connector-docs-chip">
                      <Text secondaryAction text04 as="p">
                        {localize(
                          getSourceCategoryCopy(sourceMetadata.category),
                          language
                        )}
                      </Text>
                    </div>
                  </Section>

                  <Text headingH1 as="p" className="connector-docs-hero-title">
                    {sourceMetadata.displayName}
                  </Text>
                  <Text
                    mainContentBody
                    text03
                    as="p"
                    className="connector-docs-hero-copy"
                  >
                    {localize(entry.overview.description, language)}
                  </Text>
                </Section>

                <Section alignItems="start" gap={0.75}>
                  <AppLanguageSelect />
                  <Button href={entry.setupUrl}>
                    {language === "es"
                      ? "Abrir setup en ACTIVA"
                      : "Open setup in ACTIVA"}
                  </Button>
                  {entry.secondarySetupUrl ? (
                    <Button
                      href={entry.secondarySetupUrl}
                      prominence="internal"
                    >
                      {language === "es"
                        ? "Abrir flujo alternativo"
                        : "Open alternate flow"}
                    </Button>
                  ) : null}
                </Section>
              </Section>

              <div className="connector-docs-nav">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="connector-docs-nav-pill"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </Section>
          </Card>

          {entry.providerLinks.length ? (
            <Card variant="secondary" className="connector-docs-provider-card">
              <Section
                flexDirection="row"
                justifyContent="between"
                alignItems="start"
                width="full"
                gap={0.75}
                wrap
              >
                <Section alignItems="start" gap={0.2}>
                  <Text headingH3 as="p">
                    {language === "es"
                      ? "Fuentes oficiales usadas para esta guía"
                      : "Official provider sources used for this guide"}
                  </Text>
                  <Text mainContentBody text03 as="p">
                    {language === "es"
                      ? "Úsalas cuando necesites pantallas de consola, políticas del proveedor o permisos más finos."
                      : "Use these when you need provider-console screenshots, policy details, or finer-grained permission references."}
                  </Text>
                </Section>
                <Section
                  flexDirection="row"
                  justifyContent="start"
                  alignItems="center"
                  gap={0.55}
                  wrap
                  className="connector-docs-provider-links"
                >
                  {entry.providerLinks.map((link) => (
                    <Button
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      prominence="internal"
                    >
                      {link.label}
                    </Button>
                  ))}
                </Section>
              </Section>
            </Card>
          ) : null}

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="overview"
                title={copyFor(language === "es" ? "Resumen" : "Overview")}
              />
              <Section alignItems="start" gap={0.35}>
                {entry.overview.useCases.map((useCase) => (
                  <Text
                    key={localize(useCase, language)}
                    mainContentBody
                    text03
                    as="p"
                    className="connector-docs-inline-bullet"
                  >
                    {localize(useCase, language)}
                  </Text>
                ))}
              </Section>
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="before-you-start"
                title={copyFor(
                  language === "es" ? "Antes de empezar" : "Before you start"
                )}
              />
              <PointGrid items={entry.beforeYouStart} />
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="setup"
                title={copyFor(
                  language === "es"
                    ? "Configuracion paso a paso"
                    : "Step-by-step setup"
                )}
              />
              <StepList steps={entry.setup} />
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="permissions"
                title={copyFor(
                  language === "es"
                    ? "Permisos y scopes"
                    : "Permissions and scopes"
                )}
              />
              <PointGrid items={entry.permissions} />
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="mcp"
                title={copyFor(
                  language === "es"
                    ? "Detalles de conexión MCP"
                    : "MCP connection details"
                )}
              />
              <PointGrid items={entry.mcp} />
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="verification"
                title={copyFor(
                  language === "es" ? "Verificación" : "Verification"
                )}
              />
              <PointGrid items={entry.verification} />
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="troubleshooting"
                title={copyFor(
                  language === "es"
                    ? "Solucion de problemas"
                    : "Troubleshooting"
                )}
              />
              <PointGrid items={entry.troubleshooting} />
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading id="faq" title={copyFor("FAQ")} />
              <FaqList items={entry.faq} />
            </Section>
          </Card>

          <Card className="connector-docs-section">
            <Section alignItems="start" gap={0.9}>
              <SectionHeading
                id="field-examples"
                title={copyFor(
                  language === "es"
                    ? "Campos que vas a llenar en ACTIVA"
                    : "Fields you will fill in inside ACTIVA"
                )}
              />
              <div className="connector-docs-grid connector-docs-grid--two">
                {entry.fieldExamples.map((example) => (
                  <Card
                    key={example.field}
                    variant="secondary"
                    className="connector-docs-section-card"
                  >
                    <Section alignItems="start" gap={0.45}>
                      <Text headingH3 as="p">
                        {example.field}
                      </Text>
                      <Code>{example.example}</Code>
                    </Section>
                  </Card>
                ))}
              </div>
            </Section>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function copyFor(value: string): LocalizedCopy {
  return { en: value, es: value };
}
