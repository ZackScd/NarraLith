import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enEditor from "@/i18n/en/editor.json";
import enExplorer from "@/i18n/en/explorer.json";
import enGlobal from "@/i18n/en/global.json";
import enProject from "@/i18n/en/project.json";
import enReferences from "@/i18n/en/references.json";
import enSettings from "@/i18n/en/settings.json";
import enCalendar from "@/i18n/en/calendar.json";
import enConsistency from "@/i18n/en/consistency.json";
import enGraph from "@/i18n/en/graph.json";
import enDebug from "@/i18n/en/debug.json";
import enMaps from "@/i18n/en/maps.json";
import enTimeline from "@/i18n/en/timeline.json";
import enCalendarView from "@/i18n/en/calendarView.json";
import enWorldbuilding from "@/i18n/en/worldbuilding.json";
import esConsistency from "@/i18n/es/consistency.json";
import esCalendar from "@/i18n/es/calendar.json";
import esGraph from "@/i18n/es/graph.json";
import esDebug from "@/i18n/es/debug.json";
import esMaps from "@/i18n/es/maps.json";
import esTimeline from "@/i18n/es/timeline.json";
import esCalendarView from "@/i18n/es/calendarView.json";
import esEditor from "@/i18n/es/editor.json";
import esExplorer from "@/i18n/es/explorer.json";
import esGlobal from "@/i18n/es/global.json";
import esProject from "@/i18n/es/project.json";
import esReferences from "@/i18n/es/references.json";
import esSettings from "@/i18n/es/settings.json";
import esWorldbuilding from "@/i18n/es/worldbuilding.json";

import { loadStoredLocale } from "@/lib/theme";

/** Locale activo en desarrollo; el build de producción usa `en` como fallback. */
const DEV_LOCALE = import.meta.env.DEV ? "es" : "en";
const initialLocale = loadStoredLocale() ?? DEV_LOCALE;

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      global: enGlobal,
      project: enProject,
      explorer: enExplorer,
      editor: enEditor,
      settings: enSettings,
      references: enReferences,
      worldbuilding: enWorldbuilding,
      calendar: enCalendar,
      timeline: enTimeline,
      calendarView: enCalendarView,
      consistency: enConsistency,
      maps: enMaps,
      graph: enGraph,
      debug: enDebug,
    },
    es: {
      global: esGlobal,
      project: esProject,
      explorer: esExplorer,
      editor: esEditor,
      settings: esSettings,
      references: esReferences,
      worldbuilding: esWorldbuilding,
      calendar: esCalendar,
      timeline: esTimeline,
      calendarView: esCalendarView,
      consistency: esConsistency,
      maps: esMaps,
      graph: esGraph,
      debug: esDebug,
    },
  },
  lng: initialLocale,
  fallbackLng: "en",
  defaultNS: "global",
  interpolation: { escapeValue: false },
});

export default i18n;
