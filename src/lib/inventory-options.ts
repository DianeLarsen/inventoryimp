export const predefinedUnits = [
  "jar",
  "can",
  "bottle",
  "dozen",
  "box",
  "pack",
  "lb",
  "oz",
  "g",
  "kg",
  "cup",
  "tsp",
  "tbsp",
  "unit",
  "bunch",
  "head",
  "each",
  "slice",
  "loaf",
  "stick",
  "clove",
  "leaf",
  "stalk",
  "other",
] as const;

export const commonCategories = [
  "vegetable",
  "fruit",
  "soup",
  "cereal",
  "pasta",
  "rice",
  "meat",
  "dairy",
  "frozen",
  "spices",
  "baking",
  "condiments",
  "sauces",
  "beverages",
  "snacks",
  "bread",
  "canned goods",
  "cleaning",
] as const;

export const predefinedLocations = [
  "snack cabinet",
  "left of oven cabinet",
  "long counter cabinet 1",
  "long counter cabinet 2",
  "long counter cabinet 3",
  "baking cabinet",
  "noodle cabinet",
  "spice cabinet",
  "can cabinet",
  "pantry",
  "drawer 1",
  "drawer 2",
  "drawer 3",
  "drawer 4",
  "drawer 5",
  "drawer 6",
  "kitchen fridge",
  "kitchen freezer",
  "garage fridge freezer",
  "garage fridge",
  "garage large freezer",
  "counter",
] as const;

export type PredefinedUnit = (typeof predefinedUnits)[number];

export function isPredefinedUnit(value: string): value is PredefinedUnit {
  return (predefinedUnits as readonly string[]).includes(value);
}

export function isPredefinedLocation(value: string): boolean {
  return (predefinedLocations as readonly string[]).includes(value);
}