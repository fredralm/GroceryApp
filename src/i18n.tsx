import { createContext, useContext, useState, type ReactNode } from 'react'
import { loadLang, saveLang, type Lang } from './store'

const translations = {
  en: {
    // Nav
    'nav.inventory': 'Inventory',
    'nav.recipes': 'Recipes',
    'nav.shopping': 'Shopping',
    'nav.settings': 'Settings',

    // Inventory
    'inventory.title': 'Inventory',
    'inventory.add': '+ Add',
    'inventory.empty': 'No items yet. Add what you have at home.',
    'inventory.remove': 'Remove',
    'inventory.editItem': 'Edit Item',
    'inventory.addItem': 'Add Item',
    'inventory.name': 'Name',
    'inventory.quantity': 'Quantity',
    'inventory.unit': 'Unit',
    'inventory.cancel': 'Cancel',
    'inventory.save': 'Save',
    'inventory.namePlaceholder': 'e.g. Pasta',
    'inventory.quantityPlaceholder': 'e.g. 500',
    'inventory.unitPlaceholder': 'e.g. g',

    // Recipes list
    'recipes.title': 'Recipes',
    'recipes.add': '+ Add',
    'recipes.empty': 'No recipes yet. Add your first recipe.',
    'recipes.search': 'Search recipes…',
    'recipes.ingredients': 'ingredients',
    'recipes.missing': 'missing',
    'recipes.newRecipe': 'New Recipe',
    'recipes.recipeName': 'Recipe name',
    'recipes.recipeNamePlaceholder': 'e.g. Bolognese',
    'recipes.create': 'Create',
    'recipes.cancel': 'Cancel',
    'recipes.shuffle': '🎲',
    'recipes.shareTitle': 'Share Recipes',
    'recipes.importTitle': 'Import Recipes',
    'recipes.shareBtn': 'Share',
    'recipes.importBtn': 'Import',
    'recipes.importPlaceholder': 'Paste JSON here…',
    'recipes.importConfirm': 'Import',
    'recipes.selectAll': 'Select all',
    'recipes.deselectAll': 'Deselect all',
    'recipes.importSuccess': 'Imported {n} recipe(s)',
    'recipes.importError': 'Invalid recipe data',
    'recipes.copiedToClipboard': 'Copied to clipboard',
    'recipes.noneSelected': 'Select at least one recipe',

    // Recipe detail
    'recipe.back': '← Back',
    'recipe.edit': 'Edit',
    'recipe.selectAll': 'Select all',
    'recipe.addIngredient': '+ Add ingredient',
    'recipe.addToList': '🛒 Add to shopping list',
    'recipe.cookIt': '🍳 Cook it',
    'recipe.deleteRecipe': 'Delete recipe',
    'recipe.noIngredients': 'No ingredients yet.',
    'recipe.inInventory': 'in inventory',
    'recipe.remove': 'Remove',
    'recipe.editRecipeName': 'Edit Recipe Name',
    'recipe.name': 'Name',
    'recipe.save': 'Save',
    'recipe.cancel': 'Cancel',
    'recipe.addIngredientTitle': 'Add Ingredient',
    'recipe.editIngredientTitle': 'Edit Ingredient',
    'recipe.ingredientName': 'Name',
    'recipe.ingredientNamePlaceholder': 'e.g. Ground beef',
    'recipe.quantity': 'Quantity',
    'recipe.multiplier': 'Multiplier',
    'recipe.multiplierPlaceholder': 'e.g. 0.5',
    'recipe.unit': 'Unit',
    'recipe.unitPlaceholder': 'e.g. g',
    'recipe.add': 'Add',
    'recipe.missingWarningTitle': 'Missing ingredients',
    'recipe.missingWarningBody': 'Some ingredients are missing or insufficient in your inventory. You can still cook with what you have.',
    'recipe.missingWarningCheckbox': "I'll cook with the ingredients I have in inventory",
    'recipe.subRecipeLabel': 'x',
    'recipe.editMultiplierTitle': 'Edit Multiplier',

    // Shuffle
    'shuffle.title': 'Meal Suggestion',
    'shuffle.filterAny': 'Any recipe',
    'shuffle.filterReady': 'Only recipes I can cook now',
    'shuffle.again': '🎲 Shuffle again',
    'shuffle.open': 'Open recipe',
    'shuffle.none': 'No recipes match this filter.',

    // Shopping list
    'shopping.title': 'Shopping List',
    'shopping.add': '+ Add',
    'shopping.empty': 'Your list is empty. Add items or use "Add to list" from a recipe.',
    'shopping.addItem': 'Add Item',
    'shopping.name': 'Name',
    'shopping.namePlaceholder': 'e.g. Toilet paper',
    'shopping.quantityOptional': 'Quantity (optional)',
    'shopping.unitOptional': 'Unit (optional)',
    'shopping.unitPlaceholder': 'e.g. pcs',
    'shopping.cancel': 'Cancel',
    'shopping.addBtn': 'Add',
    'shopping.buySelected': '✓ Buy selected ({n})',
    'shopping.removeSelected': '✗ Remove selected ({n})',
    'shopping.shareTitle': 'Share Shopping List',
    'shopping.importTitle': 'Import Shopping List',
    'shopping.importPlaceholder': 'Paste JSON here…',
    'shopping.importConfirm': 'Import',
    'shopping.importSuccess': 'Imported {n} item(s)',
    'shopping.importError': 'Invalid shopping list data',
    'shopping.copiedToClipboard': 'Copied to clipboard',
    'shopping.share': 'Share',
    'shopping.import': 'Import',
    'shopping.saveBtn': 'Save',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.english': 'English',
    'settings.norwegian': 'Norsk',
  },
  no: {
    // Nav
    'nav.inventory': 'Ingredienser',
    'nav.recipes': 'Oppskrifter',
    'nav.shopping': 'Handleliste',
    'nav.settings': 'Innstillinger',

    // Inventory
    'inventory.title': 'Ingredienser',
    'inventory.add': '+ Legg til',
    'inventory.empty': 'Ingen varer ennå. Legg til det du har hjemme.',
    'inventory.remove': 'Fjern',
    'inventory.editItem': 'Rediger vare',
    'inventory.addItem': 'Legg til vare',
    'inventory.name': 'Navn',
    'inventory.quantity': 'Mengde',
    'inventory.unit': 'Enhet',
    'inventory.cancel': 'Avbryt',
    'inventory.save': 'Lagre',
    'inventory.namePlaceholder': 'f.eks. Pasta',
    'inventory.quantityPlaceholder': 'f.eks. 500',
    'inventory.unitPlaceholder': 'f.eks. g',

    // Recipes list
    'recipes.title': 'Oppskrifter',
    'recipes.add': '+ Legg til',
    'recipes.empty': 'Ingen oppskrifter ennå. Legg til din første oppskrift.',
    'recipes.search': 'Søk i oppskrifter…',
    'recipes.ingredients': 'ingredienser',
    'recipes.missing': 'mangler',
    'recipes.newRecipe': 'Ny oppskrift',
    'recipes.recipeName': 'Oppskriftsnavn',
    'recipes.recipeNamePlaceholder': 'f.eks. Bolognese',
    'recipes.create': 'Opprett',
    'recipes.cancel': 'Avbryt',
    'recipes.shuffle': '🎲',
    'recipes.shareTitle': 'Del oppskrifter',
    'recipes.importTitle': 'Importer oppskrifter',
    'recipes.shareBtn': 'Del',
    'recipes.importBtn': 'Importer',
    'recipes.importPlaceholder': 'Lim inn JSON her…',
    'recipes.importConfirm': 'Importer',
    'recipes.selectAll': 'Velg alle',
    'recipes.deselectAll': 'Fjern alle valg',
    'recipes.importSuccess': 'Importerte {n} oppskrift(er)',
    'recipes.importError': 'Ugyldig oppskriftsdata',
    'recipes.copiedToClipboard': 'Kopiert til utklippstavle',
    'recipes.noneSelected': 'Velg minst én oppskrift',

    // Recipe detail
    'recipe.back': '← Tilbake',
    'recipe.edit': 'Rediger',
    'recipe.selectAll': 'Velg alle',
    'recipe.addIngredient': '+ Legg til ingrediens',
    'recipe.addToList': '🛒 Legg til handleliste',
    'recipe.cookIt': '🍳 Lag det',
    'recipe.deleteRecipe': 'Slett oppskrift',
    'recipe.noIngredients': 'Ingen ingredienser ennå.',
    'recipe.inInventory': 'på lager',
    'recipe.remove': 'Fjern',
    'recipe.editRecipeName': 'Rediger oppskriftsnavn',
    'recipe.name': 'Navn',
    'recipe.save': 'Lagre',
    'recipe.cancel': 'Avbryt',
    'recipe.addIngredientTitle': 'Legg til ingrediens',
    'recipe.editIngredientTitle': 'Rediger ingrediens',
    'recipe.ingredientName': 'Navn',
    'recipe.ingredientNamePlaceholder': 'f.eks. Kjøttdeig',
    'recipe.quantity': 'Mengde',
    'recipe.multiplier': 'Multipliserer',
    'recipe.multiplierPlaceholder': 'f.eks. 0,5',
    'recipe.unit': 'Enhet',
    'recipe.unitPlaceholder': 'f.eks. g',
    'recipe.add': 'Legg til',
    'recipe.missingWarningTitle': 'Manglende ingredienser',
    'recipe.missingWarningBody': 'Noen ingredienser mangler eller er utilstrekkelige. Du kan fortsatt lage mat med det du har.',
    'recipe.missingWarningCheckbox': 'Jeg lager mat med ingrediensene jeg har på lager',
    'recipe.subRecipeLabel': 'x',
    'recipe.editMultiplierTitle': 'Rediger multiplikator',

    // Shuffle
    'shuffle.title': 'Middagsforslag',
    'shuffle.filterAny': 'Hvilken som helst',
    'shuffle.filterReady': 'Bare oppskrifter jeg kan lage nå',
    'shuffle.again': '🎲 Bland igjen',
    'shuffle.open': 'Åpne oppskrift',
    'shuffle.none': 'Ingen oppskrifter matcher dette filteret.',

    // Shopping list
    'shopping.title': 'Handleliste',
    'shopping.add': '+ Legg til',
    'shopping.empty': 'Listen er tom. Legg til varer eller bruk "Legg til handleliste" fra en oppskrift.',
    'shopping.addItem': 'Legg til vare',
    'shopping.name': 'Navn',
    'shopping.namePlaceholder': 'f.eks. Toalettpapir',
    'shopping.quantityOptional': 'Mengde (valgfritt)',
    'shopping.unitOptional': 'Enhet (valgfritt)',
    'shopping.unitPlaceholder': 'f.eks. stk',
    'shopping.cancel': 'Avbryt',
    'shopping.addBtn': 'Legg til',
    'shopping.buySelected': '✓ Kjøp valgte ({n})',
    'shopping.removeSelected': '✗ Fjern valgte ({n})',
    'shopping.shareTitle': 'Del handleliste',
    'shopping.importTitle': 'Importer handleliste',
    'shopping.importPlaceholder': 'Lim inn JSON her…',
    'shopping.importConfirm': 'Importer',
    'shopping.importSuccess': 'Importerte {n} vare(r)',
    'shopping.importError': 'Ugyldig handleliste',
    'shopping.copiedToClipboard': 'Kopiert til utklippstavle',
    'shopping.share': 'Del',
    'shopping.import': 'Importer',
    'shopping.saveBtn': 'Lagre',

    // Settings
    'settings.title': 'Innstillinger',
    'settings.language': 'Språk',
    'settings.english': 'English',
    'settings.norwegian': 'Norsk',
  },
} as const

type TranslationKey = keyof typeof translations.en

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key as string,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang)

  function setLang(newLang: Lang) {
    saveLang(newLang)
    setLangState(newLang)
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str: string = translations[lang][key] ?? translations.en[key] ?? (key as string)
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v))
      }
    }
    return str
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useTranslation() {
  return useContext(LangContext)
}
