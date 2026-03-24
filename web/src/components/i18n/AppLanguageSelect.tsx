"use client";

import { cn } from "@/lib/utils";
import { APP_LANGUAGE_OPTIONS, isAppLanguage } from "@/lib/i18n/app-language";
import { useAppLanguage } from "@/providers/AppLanguageProvider";
import InputSelect from "@/refresh-components/inputs/InputSelect";
import Text from "@/refresh-components/texts/Text";

interface AppLanguageSelectProps {
  className?: string;
  hideLabel?: boolean;
}

export default function AppLanguageSelect({
  className,
  hideLabel = false,
}: AppLanguageSelectProps) {
  const { language, setLanguage, t } = useAppLanguage();

  function handleValueChange(nextValue: string) {
    if (!isAppLanguage(nextValue)) {
      return;
    }

    setLanguage(nextValue);
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {!hideLabel ? (
        <div className="flex flex-col gap-1">
          <Text as="p" secondaryAction text03>
            {t("common.language")}
          </Text>
          <Text as="p" secondaryBody text02>
            {t("admin.language.helper")}
          </Text>
        </div>
      ) : null}

      <InputSelect value={language} onValueChange={handleValueChange}>
        <InputSelect.Trigger placeholder={t("common.language")} />
        <InputSelect.Content>
          {APP_LANGUAGE_OPTIONS.map((option) => (
            <InputSelect.Item key={option.value} value={option.value}>
              {t(option.labelKey)}
            </InputSelect.Item>
          ))}
        </InputSelect.Content>
      </InputSelect>
    </div>
  );
}
