import React from "react";
import { useIntlContext } from "@vulcanjs/react-i18n";
import { TranslatorWrapper, useTranslatorMode } from "./TranslatorWrapper";

export const FormattedMessage = ({
  id,
  values,
  defaultMessage = "",
  className = "",
}: {
  id: string;
  values?: any;
  defaultMessage?: string;
  className?: string;
}) => {
  const intl = useIntlContext();
  const translatorMode = useTranslatorMode();

  // The message can contain sanitized HTML
  let message = intl.formatMessage({ id, defaultMessage }, values);
  const props: any = {
    "data-key": id,
  };
  const classNames = ["i18n-message", className, "t"];
  props.className = classNames.join(" ");
  const renderedMessage = (
    <span {...props} dangerouslySetInnerHTML={{ __html: message }} />
  );
  if (translatorMode)
    return (
      <TranslatorWrapper id={id} message={message}>
        {renderedMessage}
      </TranslatorWrapper>
    );
  return renderedMessage;
};
