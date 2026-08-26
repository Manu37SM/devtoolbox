import { faker } from "@faker-js/faker";
import type { MockApiResponseOptions, MockField, MockFieldType } from "./schema";

export interface MockApiResponseResult {
  output: string;
  error: { message: string } | null;
}

function generateFieldValue(type: MockFieldType): unknown {
  switch (type) {
    case "uuid":
      return faker.string.uuid();
    case "name":
      return faker.person.fullName();
    case "email":
      return faker.internet.email();
    case "phone":
      return faker.phone.number();
    case "boolean":
      return faker.datatype.boolean();
    case "int":
      return faker.number.int({ min: 0, max: 10_000 });
    case "float":
      return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });
    case "date":
      return faker.date.recent().toISOString();
    case "sentence":
      return faker.lorem.sentence();
    case "word":
      return faker.lorem.word();
    case "url":
      return faker.internet.url();
    case "company":
      return faker.company.name();
    case "city":
      return faker.location.city();
    case "country":
      return faker.location.country();
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function generateRecord(fields: MockField[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const field of fields) {
    record[field.name] = generateFieldValue(field.type);
  }
  return record;
}

export function generateMockApiResponse(options: MockApiResponseOptions): MockApiResponseResult {
  if (options.fields.length === 0) {
    return { output: "", error: { message: "Define at least one field." } };
  }
  const names = new Set<string>();
  for (const field of options.fields) {
    if (!field.name.trim()) {
      return { output: "", error: { message: "Every field needs a non-empty name." } };
    }
    if (names.has(field.name)) {
      return { output: "", error: { message: `Duplicate field name: "${field.name}".` } };
    }
    names.add(field.name);
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 500) {
    return { output: "", error: { message: "Record count must be an integer between 1 and 500." } };
  }

  if (typeof options.seed === "number") {
    faker.seed(options.seed);
  }

  const records = Array.from({ length: options.count }, () => generateRecord(options.fields));
  const payload = options.wrapInDataKey ? { data: records } : records;

  return { output: JSON.stringify(payload, null, 2), error: null };
}
