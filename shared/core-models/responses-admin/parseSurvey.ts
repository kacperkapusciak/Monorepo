import type { SurveyDocument, Field, SurveySection } from "../surveys/typings";

// build question object from outline
export const getQuestionObject = (
  questionObject: Field & {
    slug?: any;
    type?: any;
    fieldType?: any;
    showOther?: boolean;
    allowother?: boolean;
  },
  section: SurveySection,
  number?: number
) => {
  questionObject.slug = questionObject.id;
  questionObject.type = String; // default to String type

  questionObject.showOther = questionObject.allowother;

  // if type is specified, use it
  if (questionObject.fieldType) {
    if (questionObject.fieldType === "Number") {
      questionObject.type = Number;
    }
  }

  return questionObject;
};

/*

Note: section's slug can be overriden by the question

*/
export const getQuestionFieldName = (survey, section, question) => {
  const sectionSlug = question.sectionSlug || section.slug || section.id;
  let fieldName = survey.slug + "__" + sectionSlug + "__" + question.id;
  if (question.suffix) {
    fieldName += `__${question.suffix}`;
  }
  return fieldName;
};

/** 

Take a raw survey YAML and process it to give ids, fieldNames, etc.
to every question

/!\ Will NOT add templates, so that it can be reused in scripts

*/
export const parseSurvey = (survey: SurveyDocument) => {
  let i = 0;
  const parsedSurvey = { ...survey, createdAt: new Date(survey.createdAt) };
  parsedSurvey.outline = survey.outline.map((section) => {
    return {
      ...section,
      questions:
        section.questions &&
        section.questions.map((question) => {
          i++;
          // @ts-ignore TODO: question may be an array according to types
          const questionObject = getQuestionObject(question, section, i);
          questionObject.fieldName = getQuestionFieldName(
            survey,
            section,
            questionObject
          );
          return questionObject;
        }),
    };
  });
  return parsedSurvey;
};
