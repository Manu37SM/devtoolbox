import { faker } from "@faker-js/faker";
import type { FakeDataGeneratorOptions } from "./schema";

export interface FakeDataGeneratorResult {
  output: string;
  error: { message: string } | null;
}

function makePerson() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    birthDate: faker.date.birthdate().toISOString().slice(0, 10),
  };
}

function makeAddress() {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country(),
  };
}

function makeCompany() {
  return {
    name: faker.company.name(),
    catchPhrase: faker.company.catchPhrase(),
    industry: faker.commerce.department(),
  };
}

function makeProduct() {
  return {
    name: faker.commerce.productName(),
    price: faker.commerce.price(),
    category: faker.commerce.department(),
    description: faker.commerce.productDescription(),
  };
}

function makeInternetUser() {
  return {
    username: faker.internet.username(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    avatar: faker.image.avatar(),
  };
}

const GENERATORS: Record<FakeDataGeneratorOptions["recordType"], () => Record<string, string>> = {
  person: makePerson,
  address: makeAddress,
  company: makeCompany,
  product: makeProduct,
  "internet-user": makeInternetUser,
};

/** Generates an array of fake/mock data records using @faker-js/faker,
 * entirely client-side. When `seed` is provided, faker is seeded first so
 * output is reproducible across runs. */
export function generateFakeData(options: FakeDataGeneratorOptions): FakeDataGeneratorResult {
  if (options.count < 1) {
    return { output: "", error: { message: "Count must be at least 1." } };
  }

  if (typeof options.seed === "number") {
    faker.seed(options.seed);
  }

  const generator = GENERATORS[options.recordType];
  const records = Array.from({ length: options.count }, () => generator());

  return { output: JSON.stringify(records, null, 2), error: null };
}
