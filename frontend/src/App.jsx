import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Search, User, Map, AlertTriangle, CheckCircle, Clock, ShieldCheck, Plus, MapPin, RefreshCw, Bell, Edit3, ChevronLeft, ChevronRight, Globe, ChevronDown, Users, ImageOff, X } from 'lucide-react';

// --- CREDENCIALES REALES SUPABASE ---
const SUPABASE_URL = 'https://mtbtgkzwaukqkayxfwqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YnRna3p3YXVrcWtheXhmd3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTMzMzUsImV4cCI6MjA5NzkyOTMzNX0.Hhm8kNtc5AU9mg37n8bAT2W7iA9HnaK4KD5F69vYkdI';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const formatDateTime = (value) => new Date(value).toLocaleString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

// ─────────────────────────────────────────────
// DICCIONARIO i18n ULTRALIGERO
// ─────────────────────────────────────────────
const T = {
  es: {
    homeTitle: 'ENCUENTRAME',
    homeSubtitle: 'Alertas en tiempo real: reporta a tu familiar y recibe notificaciones automáticas en tu Telegram al instante.',
    statsReports: 'Registros',
    statsMissing: 'Buscados',
    statsSafe: 'A Salvo ✓',
    statsInjured: 'Heridos',
    persons: 'Personas',
    personsDesc: 'Buscar familiares o reportar personas extraviadas / encontradas.',
    zones: 'Focos de Rescate',
    zonesDesc: 'Reportar derrumbes, colapsos, o solicitar rescate urgente.',
    dashPersons: 'Búsqueda de Personas',
    dashZones: 'Focos de Rescate',
    searchPlaceholderP: 'Escribe nombre, apellido o cédula...',
    searchPlaceholderZ: 'Buscar por sector o edificio...',
    btnNewPerson: 'Crear Reporte de Persona',
    btnNewZone: 'Reportar Foco de Rescate',
    noResults: 'No encontramos coincidencias para',
    noRecords: 'No hay registros aún.',
    noResultsHint: 'Si sabes de esta persona, toca el botón azul de arriba para reportarla de una vez.',
    loadMore: 'Cargar 25 reportes más',
    loadMoreHint: '¿No encuentras a quien buscas? Usa la barra de búsqueda arriba para ahorrar datos.',
    loading: 'Cargando base de datos...',
    urgencyAlta: 'Alta',
    urgencyMedia: 'Media',
    urgencyBaja: 'Baja',
    statusBuscado: 'Buscado',
    statusASalvo: 'A Salvo',
    statusHerido: 'Herido',
    statusFallecido: 'Fallecido',
    // Detail
    detailTitle: 'Detalles del Reporte',
    detailUrgencyHigh: 'Vidas en Peligro',
    detailUrgencyMed: 'Aislados',
    detailLocation: 'Último Lugar Visto o Refugio/Hospital',
    detailSituation: 'Situación',
    detailContact: 'Contacto del reporte inicial',
    detailDoc: 'C.I / Pasaporte:',
    btnTelegram: 'Recibir Alertas en mi Telegram',
    btnContribute: 'Aportar Nueva Información (Evolución)',
    // Crowd-Correction
    btnFalsoPositivo: 'Confirmo: No está en este lugar',
    btnFalsoPositivoSending: 'Reportando...',
    falsoPositivoError: 'No se pudo procesar. Intente de nuevo.',
    historyTitle: 'Historial de Actividad',
    historyEmpty: 'Generando reporte inicial...',
    historyHide: 'Ocultar historial',
    historyMore: 'Ver {n} registros más',
    // Formularios
    formPersonaTitle: 'Reportar Persona',
    formPersonaWarning: 'Solo completa lo que sepas. No te detengas si te falta algún dato.',
    formPersonaLabel1: '1. Nombre o Descripción de la Persona *',
    formPersonaPlaceholder1: 'Ej: Juan Pérez o Abuela con camisa roja',
    formPersonaLabel2: '2. Cédula o Pasaporte (Opcional)',
    formPersonaPlaceholder2: 'Ej: V-12345678',
    formPersonaLabel3: '3. Estado Actual *',
    formPersonaLabel4: '4. Último Lugar Visto o Refugio/Hospital Actual *',
    formPersonaPlaceholder4: 'Sector, calle, o nombre de hospital',
    formPersonaLabel5: '5. Tu Teléfono (Opcional - Para que te contacten rescatistas)',
    formPersonaPlaceholder5: 'Ej: 0412-1234567',
    btnPublish: 'Publicar Reporte',
    btnSaving: 'Guardando...',
    formZonaTitle: 'Reportar Foco',
    formZonaLabel1: '1. Nombre del Edificio / Sector de Emergencia *',
    formZonaPlaceholder1: 'Ej: Residencias Sol de San Bernardino',
    formZonaLabel2: '2. Nivel de Peligro *',
    formZonaBtnAlta: 'Vidas en Peligro (Atrapados)',
    formZonaBtnMedia: 'Familias Aisladas / Sin Salida',
    formZonaBtnBaja: 'Zona Afectada (Sin heridos)',
    formZonaLabel3: '3. Situación (Describa la emergencia) *',
    formZonaPlaceholder3: 'Ej: Edificio colapsado parcialmente, gritos en el sótano...',
    formZonaLabel4: '4. Tu Teléfono (Opcional - Para rescatistas)',
    formZonaPlaceholder4: 'Ej: 0414-1234567',
    btnAlert: 'Alertar a Rescatistas',
    btnAlertSending: 'Enviando Alerta...',
    formAportePersonaTitle: 'Actualizar Persona',
    formAporteLabel1: 'Nuevo Estado Vital',
    formAporteLabel2: 'Cédula o Pasaporte (Completar si no la tenía)',
    formAporteLabel3: 'Ubicación Actualizada (Refugio u Hospital)',
    btnUpdate: 'Actualizar Información',
    formAporteZonaTitle: 'Actualizar Foco',
    formAporteZonaLabel1: 'Nuevo Nivel de Urgencia',
    formAporteZonaLabel2: 'Situación Actual (Evolución)',
    btnUpdateZone: 'Actualizar Rescatistas',
    // Modal
    modalTitle: '¡Reporte Creado!',
    modalDesc: '¿Quieres recibir notificaciones automáticas en tu Telegram si hay cambios sobre',
    modalBtnTelegram: 'Sí, activar en Telegram',
    modalBtnSkip: 'No, ver en la web',
    footerTitle: 'Unidos para salvar vidas',
    footerDesc: 'Plataforma ciudadana de código abierto. Ingeniería de supervivencia diseñada para operar en redes colapsadas.',
    footerTechTitle: 'Cero Imágenes (Carga Inmediata)',
    footerTechDesc: 'Decisión estratégica. Eliminamos las fotos para garantizar que abra en milisegundos en redes 2G y ahorre batería. Los datos rápidos salvan vidas.',
    footerColabTitle: 'Esfuerzo Colaborativo',
    footerColabDesc: 'Si buscas a alguien, repórtalo. Si tienes información, actualiza su estado. Entre todos nos encontramos.',
    footerDataTitle: 'Privacidad Vital',
    footerDataDesc: 'No comercializamos ni compartimos información. Este sistema existe con un único fin operativo.',
    pressMenu: 'Prensa / Data Room',
    pressTitle: 'Data Room de Prensa',
    pressSubtitle: 'Encuéntrame VE — IDIKI TECH SRL',
    pressTokenPh: 'Token de acceso (Ej: PVE-XXXX)',
    pressBtnAccess: 'Acceder al Portal',
    pressRestricted: 'Acceso restringido a periodistas y organizaciones verificadas.',
    pressTokenErr: 'Token inválido. Contacta a IDIKI TECH SRL.',
    pressMetricsTitle: 'Cifras del Censo',
    pressTotal: 'Total en Censo',
    pressMissing: 'Aún Desaparecidos',
    pressHosp: 'Ingresados (Hospitales)',
    pressSafe: 'Localizados (A Salvo)',
    pressNote: 'Los decesos están excluidos — requieren verificación forense oficial.',
    pressDataTitle: 'Dataset Oficial',
    pressDataDesc: 'CSV Sanitizado. Fuentes anonimizadas y duplicados resueltos.',
    pressBtnDl: 'DESCARGAR DATASET (CSV)',
    pressBtnDlLoading: 'PROCESANDO DATASET...',
    pressAttribution: 'Atribución requerida: "Fuente: Encuéntrame VE / IDIKI TECH SRL, 2026"',
    pressMethTitle: 'Marco Metodológico',
    pressMethDesc: 'Data consolidada mediante crowdsourcing descentralizado, inteligencia de fuentes abiertas (OSINT) y digitalización de registros analógicos por la diáspora. Depurada con algoritmos de deduplicación fonética (Trigramas).',
    pressBtnRead: 'Leer Metodología Completa',
    pressModalTitle: 'Marco Metodológico y Codebook',
    pressModalFooterLeft: 'Equipo de Integridad de Datos — Encuéntrame VE',
    legalCompany: 'IDIKI TECH SRL',
    legalRNC: 'RNC: 133-57596-5',
    legalHumanitarian: 'Plataforma de uso humanitario pro-bono.',
    legalCopyright: '© 2026 Todos los derechos reservados.',
  },
  en: {
    homeTitle: 'FIND ME',
    homeSubtitle: 'Real-time alerts: report your relative and receive automatic Telegram notifications instantly.',
    statsReports: 'Reports',
    statsMissing: 'Missing',
    statsSafe: 'Safe ✓',
    statsInjured: 'Injured',
    persons: 'Persons',
    personsDesc: 'Search for relatives or report missing / found people.',
    zones: 'Rescue Zones',
    zonesDesc: 'Report collapses, cave-ins, or request urgent rescue.',
    dashPersons: 'Person Search',
    dashZones: 'Rescue Zones',
    searchPlaceholderP: 'Type name, ID or passport...',
    searchPlaceholderZ: 'Search by sector or building...',
    btnNewPerson: 'Create Person Report',
    btnNewZone: 'Report Rescue Zone',
    noResults: 'No matches found for',
    noRecords: 'No records yet.',
    noResultsHint: 'If you know this person, tap the blue button above to report them.',
    loadMore: 'Load 25 more reports',
    loadMoreHint: "Can't find who you're looking for? Use the search bar above to save data.",
    loading: 'Loading database...',
    urgencyAlta: 'High',
    urgencyMedia: 'Medium',
    urgencyBaja: 'Low',
    statusBuscado: 'Missing',
    statusASalvo: 'Safe',
    statusHerido: 'Injured',
    statusFallecido: 'Deceased',
    // Detail
    detailTitle: 'Report Details',
    detailUrgencyHigh: 'Lives at Risk',
    detailUrgencyMed: 'Isolated',
    detailLocation: 'Last Known Location or Shelter/Hospital',
    detailSituation: 'Situation',
    detailContact: 'Initial Contact',
    detailDoc: 'ID / Passport:',
    btnTelegram: 'Receive Alerts on my Telegram',
    btnContribute: 'Submit New Information (Update)',
    // Crowd-Correction
    btnFalsoPositivo: 'Confirm: Not at this location',
    btnFalsoPositivoSending: 'Reporting...',
    falsoPositivoError: 'Could not process. Please try again.',
    historyTitle: 'Activity History',
    historyEmpty: 'Generating initial report...',
    historyHide: 'Hide history',
    historyMore: 'View {n} more records',
    // Forms
    formPersonaTitle: 'Report Person',
    formPersonaWarning: "Fill in what you know. Don't stop if you are missing some data.",
    formPersonaLabel1: '1. Person Name or Description *',
    formPersonaPlaceholder1: 'Ex: John Doe or Elderly woman in red shirt',
    formPersonaLabel2: '2. ID or Passport (Optional)',
    formPersonaPlaceholder2: 'Ex: V-12345678',
    formPersonaLabel3: '3. Current Status *',
    formPersonaLabel4: '4. Last Location Seen or Current Shelter/Hospital *',
    formPersonaPlaceholder4: 'Sector, street, or hospital name',
    formPersonaLabel5: '5. Your Phone (Optional - So rescuers can reach you)',
    formPersonaPlaceholder5: 'Ex: 0412-1234567',
    btnPublish: 'Publish Report',
    btnSaving: 'Saving...',
    formZonaTitle: 'Report Zone',
    formZonaLabel1: '1. Building Name / Emergency Sector *',
    formZonaPlaceholder1: 'Ex: Downtown Emergency Building',
    formZonaLabel2: '2. Danger Level *',
    formZonaBtnAlta: 'Lives at Risk (Trapped)',
    formZonaBtnMedia: 'Isolated Families / No Exit',
    formZonaBtnBaja: 'Affected Zone (No injuries)',
    formZonaLabel3: '3. Situation (Describe the emergency) *',
    formZonaPlaceholder3: 'Ex: Building partially collapsed, voices heard in basement...',
    formZonaLabel4: '4. Your Phone (Optional - For rescuers)',
    formZonaPlaceholder4: 'Ex: 0414-1234567',
    btnAlert: 'Alert Rescuers',
    btnAlertSending: 'Sending Alert...',
    formAportePersonaTitle: 'Update Person',
    formAporteLabel1: 'New Vital Status',
    formAporteLabel2: 'ID or Passport (Fill if missing)',
    formAporteLabel3: 'Updated Location (Shelter or Hospital)',
    btnUpdate: 'Update Information',
    formAporteZonaTitle: 'Update Zone',
    formAporteZonaLabel1: 'New Urgency Level',
    formAporteZonaLabel2: 'Current Situation (Update)',
    btnUpdateZone: 'Update Rescuers',
    // Modal
    modalTitle: 'Report Created!',
    modalDesc: 'Do you want to receive automatic Telegram notifications if there are updates about',
    modalBtnTelegram: 'Yes, activate on Telegram',
    modalBtnSkip: 'No, view on web',
    footerTitle: 'United to save lives',
    footerDesc: 'Open-source citizen platform. Survival engineering designed to operate on collapsed networks.',
    footerTechTitle: 'Zero Images (Instant Load)',
    footerTechDesc: 'Strategic decision. We removed photos to ensure it opens in milliseconds on 2G networks and saves battery. Fast data saves lives.',
    footerColabTitle: 'Collaborative Effort',
    footerColabDesc: "If you're looking for someone, report them. If you have info, update their status. We find each other together.",
    footerDataTitle: 'Vital Privacy',
    footerDataDesc: 'We do not sell or share data. This system exists for a single operational purpose.',
    pressMenu: 'Press Data Room',
    pressTitle: 'Press Data Room',
    pressSubtitle: 'Encuéntrame VE — IDIKI TECH SRL',
    pressTokenPh: 'Access token (e.g. PVE-XXXX)',
    pressBtnAccess: 'Access Portal',
    pressRestricted: 'Restricted to verified journalists and organizations.',
    pressTokenErr: 'Invalid token. Contact IDIKI TECH SRL.',
    pressMetricsTitle: 'Census Figures',
    pressTotal: 'Total in Census',
    pressMissing: 'Still Missing',
    pressHosp: 'Hospitalized',
    pressSafe: 'Located / Safe',
    pressNote: 'Mortality figures excluded — require official forensic verification.',
    pressDataTitle: 'Official Dataset',
    pressDataDesc: 'Sanitized CSV. Anonymized sources and resolved duplicates.',
    pressBtnDl: 'DOWNLOAD DATASET (CSV)',
    pressBtnDlLoading: 'PROCESSING DATASET...',
    pressAttribution: 'Attribution required: "Source: Encuéntrame VE / IDIKI TECH SRL, 2026"',
    pressMethTitle: 'Methodological Framework',
    pressMethDesc: 'Data consolidated via decentralized crowdsourcing, Open Source Intelligence (OSINT), and digitization of analog records by the diaspora. Cleansed using phonetic deduplication algorithms.',
    pressBtnRead: 'Read Full Methodology',
    pressModalTitle: 'Methodological Framework & Codebook',
    pressModalFooterLeft: 'Encuéntrame VE Data Integrity Team',
    legalCompany: 'IDIKI TECH SRL',
    legalRNC: 'RNC: 133-57596-5',
    legalHumanitarian: 'Pro-bono humanitarian use platform.',
    legalCopyright: '© 2026 All rights reserved.',
  },
  fi: {
    homeTitle: 'LÖYDÄ MINUT',
    homeSubtitle: 'Reaaliaikaiset hälytykset: ilmoita sukulaisestasi ja saa automaattiset Telegram-ilmoitukset heti.',
    statsReports: 'Rekisterit',
    statsMissing: 'Kadonnut',
    statsSafe: 'Turvassa ✓',
    statsInjured: 'Sairaala',
    persons: 'Henkilöt',
    personsDesc: 'Etsi sukulaisia tai ilmoita kadonneista / löydetyistä.',
    zones: 'Pelastusalueet',
    zonesDesc: 'Ilmoita romahduksista tai pyydä kiireellistä pelastusta.',
    dashPersons: 'Henkilöhaku',
    dashZones: 'Pelastusalueet',
    searchPlaceholderP: 'Kirjoita nimi tai henkilötunnus...',
    searchPlaceholderZ: 'Hae sektorin tai rakennuksen mukaan...',
    btnNewPerson: 'Luo henkilöraportti',
    btnNewZone: 'Ilmoita pelastusalue',
    noResults: 'Ei tuloksia haulle',
    noRecords: 'Ei rekisterejä vielä.',
    noResultsHint: 'Jos tiedät tästä henkilöstä, paina sinistä nappia yllä.',
    loadMore: 'Lataa 25 lisää raporttia',
    loadMoreHint: 'Etkö löydä etsimääsi? Käytä hakupalkkia yllä.',
    loading: 'Ladataan tietokantaa...',
    urgencyAlta: 'Korkea',
    urgencyMedia: 'Keskitaso',
    urgencyBaja: 'Matala',
    statusBuscado: 'Kadonnut',
    statusASalvo: 'Turvassa',
    statusHerido: 'Sairaalassa',
    statusFallecido: 'Menehtynyt',
    detailTitle: 'Raportin tiedot',
    detailUrgencyHigh: 'Henget vaarassa',
    detailUrgencyMed: 'Eristyksissä',
    detailLocation: 'Viimeisin tunnettu sijainti tai sairaala',
    detailSituation: 'Tilanne',
    detailContact: 'Alkuperäinen yhteyshenkilo',
    detailDoc: 'Henkilötunnus:',
    btnTelegram: 'Vastaanota hälytykset Telegramissa',
    btnContribute: 'Lähetä uutta tietoa',
    btnFalsoPositivo: 'Vahvistan: Ei ole tässä paikassa',
    btnFalsoPositivoSending: 'Ilmoitetaan...',
    falsoPositivoError: 'Käsittely epäonnistui. Yritä uudelleen.',
    historyTitle: 'Toimintahistoria',
    historyEmpty: 'Luodaan alkuraporttia...',
    historyHide: 'Piilota historia',
    historyMore: 'Näytä {n} lisää',
    formPersonaTitle: 'Ilmoita henkilö',
    formPersonaWarning: 'Täytä mitä tiedät. Älä pysähdy puuttuviin tietoihin.',
    formPersonaLabel1: '1. Nimi tai kuvaus *',
    formPersonaPlaceholder1: 'Esim: Juan Pérez',
    formPersonaLabel2: '2. Henkilötunnus (valinnainen)',
    formPersonaPlaceholder2: 'Esim: V-12345678',
    formPersonaLabel3: '3. Nykyinen tila *',
    formPersonaLabel4: '4. Viimeisin tunnettu sijainti *',
    formPersonaPlaceholder4: 'Kaupunginosa, katu tai sairaala',
    formPersonaLabel5: '5. Puhelinnumerosi (valinnainen)',
    formPersonaPlaceholder5: 'Esim: 0412-1234567',
    btnPublish: 'Julkaise raportti',
    btnSaving: 'Tallennetaan...',
    formZonaTitle: 'Ilmoita alue',
    formZonaLabel1: '1. Rakennuksen nimi / hätäalue *',
    formZonaPlaceholder1: 'Esim: Keskustan hätärakennus',
    formZonaLabel2: '2. Vaarataso *',
    formZonaBtnAlta: 'Henget vaarassa (Loukkuun jääneet)',
    formZonaBtnMedia: 'Eristyksissä / Ei ulospääsyä',
    formZonaBtnBaja: 'Vaikutusalue (Ei loukkaantuneita)',
    formZonaLabel3: '3. Tilanne *',
    formZonaPlaceholder3: 'Esim: Rakennus osittain romahtanut...',
    formZonaLabel4: '4. Puhelinnumerosi (valinnainen)',
    formZonaPlaceholder4: 'Esim: 0414-1234567',
    btnAlert: 'Hälytä pelastajat',
    btnAlertSending: 'Lähetetään hälytystä...',
    formAportePersonaTitle: 'Päivitä henkilö',
    formAporteLabel1: 'Uusi tila',
    formAporteLabel2: 'Henkilötunnus (täytä jos puuttuu)',
    formAporteLabel3: 'Päivitetty sijainti',
    btnUpdate: 'Päivitä tiedot',
    formAporteZonaTitle: 'Päivitä alue',
    formAporteZonaLabel1: 'Uusi kiireellisyystaso',
    formAporteZonaLabel2: 'Nykyinen tilanne',
    btnUpdateZone: 'Päivitä pelastajat',
    modalTitle: 'Raportti luotu!',
    modalDesc: 'Haluatko vastaanottaa automaattiset Telegram-ilmoitukset muutoksista koskien',
    modalBtnTelegram: 'Kyllä, aktivoi Telegramissa',
    modalBtnSkip: 'Ei, katso verkossa',
    footerTitle: 'Yhdessä pelastamme henkiä',
    footerDesc: 'Avoimen lähdekoodin kansalaisalusta. Selviytymistekniikka romahtaneille verkoille.',
    footerTechTitle: 'Nolla kuvaa (Välitön lataus)',
    footerTechDesc: 'Strateginen päätös. Poistimme kuvat taataksemme millisekunnin latausajat 2G-verkoissa.',
    footerColabTitle: 'Yhteistyöponnistus',
    footerColabDesc: 'Jos etsit jotakuta, ilmoita heistä. Jos sinulla on tietoa, päivitä tila.',
    footerDataTitle: 'Tärkeä yksityisyys',
    footerDataDesc: 'Emme myy tai jaa tietoja. Tämä järjestelmä on olemassa yhtä ainoaa tarkoitusta varten.',
    pressMenu: 'Lehdistöhuone (Data)',
    pressTitle: 'Lehdistöhuone',
    pressSubtitle: 'Encuéntrame VE — IDIKI TECH SRL',
    pressTokenPh: 'Pääsytunnus (esim. PVE-XXXX)',
    pressBtnAccess: 'Kirjaudu Sisään',
    pressRestricted: 'Pääsy sallittu vain vahvistetuille journalisteille ja järjestöille.',
    pressTokenErr: 'Virheellinen tunnus. Ota yhteyttä IDIKI TECH SRL.',
    pressMetricsTitle: 'Väestönlaskennan Luvut',
    pressTotal: 'Yhteensä',
    pressMissing: 'Kadonnut',
    pressHosp: 'Sairaalassa',
    pressSafe: 'Löydetty',
    pressNote: 'Kuolleisuusluvut jätetty pois — vaativat virallisen oikeuslääketieteellisen vahvistuksen.',
    pressDataTitle: 'Virallinen Tietojoukko',
    pressDataDesc: 'Puhdistettu CSV. Lähteet anonymisoitu ja kaksoiskappaleet poistettu.',
    pressBtnDl: 'LATAA TIETOJOUKKO (CSV)',
    pressBtnDlLoading: 'KASITELLAAN TIETOA...',
    pressAttribution: 'Lahdeviite vaaditaan: "Lahde: Encuentrame VE / IDIKI TECH SRL, 2026"',
    pressMethTitle: 'Metodologinen Viitekehys',
    pressMethDesc: 'Tiedot on koottu hajautetun joukkoistamisen, avoimien lähteiden tiedustelun (OSINT) ja analogisten asiakirjojen digitoinnin avulla. Puhdistettu foneettisilla algoritmeilla.',
    pressBtnRead: 'Lue Koko Metodologia',
    pressModalTitle: 'Metodologia ja Koodikirja',
    pressModalFooterLeft: 'Encuentrame VE:n datan eheystiimi',
    legalCompany: 'IDIKI TECH SRL',
    legalRNC: 'RNC: 133-57596-5',
    legalHumanitarian: 'Pro-bono humanitaarinen alusta.',
    legalCopyright: '© 2026 Kaikki oikeudet pidätetään.',
  }
};

// ─────────────────────────────────────────────
// Componentes auxiliares FUERA de App
// para evitar que React los destruya/recree en cada render
// ─────────────────────────────────────────────

const TrustBadge = memo(({ level }) => {
  if (level >= 3) return <span className="bg-blue-600 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><ShieldCheck size={12}/> Oficial</span>;
  if (level === 2) return <span className="bg-green-600 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><ShieldCheck size={12}/> Rescate</span>;
  if (level === 1) return <span className="bg-yellow-500 text-black text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><User size={12}/> Familiar</span>;
  return <span className="bg-gray-100 border border-gray-400 text-gray-600 text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertTriangle size={12}/> Civil (Nivel 0)</span>;
});

const StatusPill = memo(({ status, lang = 'es' }) => {
  const s = status ? status.toLowerCase() : '';
  let bg = 'bg-gray-800';
  if (s === 'buscado') bg = 'bg-red-600';
  if (s === 'a_salvo') bg = 'bg-green-600';
  if (s === 'herido') bg = 'bg-orange-500';
  if (s === 'fallecido') bg = 'bg-black border border-gray-500';
  let label = status.replace('_', ' ');
  if (s === 'buscado') label = T[lang].statusBuscado;
  if (s === 'a_salvo') label = T[lang].statusASalvo;
  if (s === 'herido') label = T[lang].statusHerido;
  if (s === 'fallecido') label = T[lang].statusFallecido;
  return <span className={`${bg} text-white text-xs px-2 py-1 font-bold uppercase tracking-wide`}>{label}</span>;
});

const PersonaCard = memo(({ item, onClick, lang = 'es' }) => (
  <div onClick={onClick} className="bg-white border-2 border-black p-4 cursor-pointer active:scale-[0.98] transition-transform">
    <div className="flex justify-between items-start mb-3">
      <TrustBadge level={item.trust_level} />
      <StatusPill status={item.status} lang={lang} />
    </div>
    <h3 className="text-lg font-black leading-tight mb-1">{item.name_desc}</h3>
    {item.document_id && <p className="text-xs font-mono font-bold text-gray-600 mb-2">C.I / Pasaporte: {item.document_id}</p>}
    <p className="text-sm text-gray-700 font-medium line-clamp-2">
      <MapPin size={14} className="inline mr-1 -mt-1"/>
      {item.location_text}
    </p>
    <p className="text-[10px] text-gray-400 font-mono mt-3 uppercase text-right">
      {formatDateTime(item.created_at)}
    </p>
  </div>
));

const ZonaCard = memo(({ item, onClick, lang = 'es' }) => (
  <div onClick={onClick} className="bg-white border-2 border-black p-4 cursor-pointer active:scale-[0.98] transition-transform">
    <div className="flex justify-between items-start mb-3">
      <TrustBadge level={item.trust_level} />
      <span className={`text-xs px-2 py-1 font-bold uppercase text-white ${item.urgency === 'alta' ? 'bg-red-600' : 'bg-orange-500'}`}>
        {lang === 'en' ? 'Urgency' : 'Urgencia'}: {{ alta: T[lang].urgencyAlta, media: T[lang].urgencyMedia, baja: T[lang].urgencyBaja }[item.urgency] || item.urgency}
      </span>
    </div>
    <h3 className="text-lg font-black leading-tight mb-2">{item.name}</h3>
    <p className="text-sm text-gray-700 font-medium line-clamp-2">
      <MapPin size={14} className="inline mr-1 -mt-1"/>
      {item.situation}
    </p>
    <p className="text-[10px] text-gray-400 font-mono mt-3 uppercase text-right">
      {formatDateTime(item.created_at)}
    </p>
  </div>
));

// ─── DATA ROOM DE PRENSA ───
// Componente standalone (fuera de App) para hooks estables y reset de estado al salir
const PressView = ({ setView, incidentId, lang }) => {
  const TOKENS_VALIDOS = ['PVE-2026-TOMMI', 'PVE-2026-B'];
  const t = T[lang] || T.es;
  const [tokenInput, setTokenInput] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [pressStats, setPressStats] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    if (!autenticado || !incidentId) return;
    fetch(`${SUPABASE_URL}/rest/v1/rpc/get_incident_stats`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ p_incident_id: incidentId })
    }).then(r => r.json()).then(d => setPressStats(d)).catch(console.error);
  }, [autenticado, incidentId]);

  const verificarToken = () => {
    if (TOKENS_VALIDOS.includes(tokenInput.trim().toUpperCase())) {
      setAutenticado(true);
      setTokenError(false);
    } else {
      setTokenError(true);
    }
  };

  const descargarCSV = async () => {
    setDescargando(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/press_census?select=*&limit=200000`, { headers: HEADERS });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;
      const cols = Object.keys(data[0]);
      const rows = data.map(r =>
        cols.map(c => {
          let v = r[c] ?? '';
          v = String(v).replace(/[\r\n]+/g, ' ');
          return v.includes(',') || v.includes('"')
            ? '"' + v.replace(/"/g, '""') + '"'
            : v;
        }).join(',')
      );
      const csv = '\uFEFF' + [cols.join(','), ...rows].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `encuentrame_ve_census_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch (e) {
      console.error('Error descargando CSV:', e);
    } finally {
      setDescargando(false);
    }
  };

  if (!autenticado) {
    return (
      <div className="bg-white min-h-screen animate-fade-in">
        <div className="bg-black text-white p-4 sticky top-0 flex items-center gap-3 shadow-md z-10">
          <button onClick={() => setView('home')} className="p-1 -ml-2 hover:bg-gray-800 rounded-full active:scale-90">
            <ChevronLeft size={32} />
          </button>
          <h2 className="font-black text-lg flex-1 truncate tracking-tight">{t.pressMenu}</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="border-4 border-black p-5 space-y-2">
            <h3 className="font-black text-xl uppercase tracking-tight">{t.pressTitle}</h3>
            <p className="text-sm text-gray-600 font-medium">{t.pressSubtitle}</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder={t.pressTokenPh}
              className={`w-full p-4 border-2 font-mono text-sm focus:outline-none ${tokenError ? 'border-red-600 bg-red-50' : 'border-black'}`}
              value={tokenInput}
              onChange={e => { setTokenInput(e.target.value); setTokenError(false); }}
              onKeyDown={e => e.key === 'Enter' && verificarToken()}
            />
            {tokenError && (
              <p className="text-red-600 font-bold text-xs uppercase tracking-wide">{t.pressTokenErr}</p>
            )}
            <button
              onClick={verificarToken}
              className="w-full bg-black text-white font-black uppercase p-4 hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all"
            >
              {t.pressBtnAccess}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center font-medium">{t.pressRestricted}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-black text-white p-4 sticky top-0 flex items-center gap-3 shadow-md z-10">
        <button onClick={() => setView('home')} className="p-1 -ml-2 hover:bg-gray-800 rounded-full active:scale-90">
          <ChevronLeft size={32} />
        </button>
        <h2 className="font-black text-lg flex-1 truncate tracking-tight">{t.pressTitle}</h2>
      </div>
      <div className="p-5 space-y-6">
        {/* Métricas */}
        <div className="border-4 border-black p-5">
          <h3 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-500">
            {t.pressMetricsTitle} — {new Date().toISOString().slice(0, 10)}
          </h3>
          {pressStats ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-3xl font-black">{(pressStats.total - 144).toLocaleString()}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{t.pressTotal}</span>
              </div>
              <div>
                <span className="text-3xl font-black text-red-600">{pressStats.buscados?.toLocaleString()}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-red-500 mt-1">{t.pressMissing}</span>
              </div>
              <div>
                <span className="text-3xl font-black text-orange-500">{pressStats.heridos?.toLocaleString()}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-orange-400 mt-1">{t.pressHosp}</span>
              </div>
              <div>
                <span className="text-3xl font-black text-green-600">{pressStats.a_salvo?.toLocaleString()}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-green-500 mt-1">{t.pressSafe}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 font-mono text-sm animate-pulse">{t.loading}</p>
          )}
          <p className="text-[9px] text-gray-400 font-mono mt-4 border-t border-gray-100 pt-3">
            {new Date().toLocaleString('en-US')} UTC • {t.pressNote}
          </p>
        </div>

        {/* Descarga */}
        <div className="border-4 border-black p-5 space-y-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-gray-500">{t.pressDataTitle}</h3>
          <p className="text-sm text-gray-700 font-medium">{t.pressDataDesc}</p>
          <button
            onClick={descargarCSV}
            disabled={descargando}
            className="w-full bg-black text-white font-black uppercase p-4 hover:bg-gray-800 disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            {descargando ? t.pressBtnDlLoading : t.pressBtnDl}
          </button>
          <p className="text-[10px] text-gray-400">{t.pressAttribution}</p>
        </div>

        {/* Metodología */}
        <div className="border border-gray-300 p-5 space-y-4 bg-gray-50">
          <h3 className="font-black text-xs uppercase tracking-widest text-gray-500">{t.pressMethTitle}</h3>
          <p className="text-xs text-gray-700 leading-relaxed">{t.pressMethDesc}</p>
          <button
            onClick={() => setShowMethodology(true)}
            className="w-full bg-white border-2 border-black text-black font-bold uppercase py-3 text-xs hover:bg-gray-100 transition-colors"
          >
            {t.pressBtnRead}
          </button>
        </div>
      </div>

      {showMethodology && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full my-auto shadow-2xl relative">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="font-black text-lg uppercase tracking-tight">{t.pressModalTitle}</h2>
              <button onClick={() => setShowMethodology(false)} className="text-gray-500 hover:text-black p-2">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 text-sm text-gray-800 font-serif leading-relaxed h-[70vh] overflow-y-auto">
              <section>
                <h3 className="font-bold text-black uppercase text-xs tracking-widest mb-2">1. Data Provenance & Decentralized Crowdsourcing</h3>
                <p>In a collapsed-infrastructure environment, standard data collection is impossible. This dataset relies on asynchronous crowdsourcing. Volunteers on the ground captured photographic and video evidence of handwritten admission lists at medical outposts and shelters. Simultaneously, the Venezuelan diaspora globally operated as a decentralized data-entry network, applying OSINT (Open Source Intelligence) techniques to digitize these analog records and social media distress signals in real-time.</p>
              </section>
              <section>
                <h3 className="font-bold text-black uppercase text-xs tracking-widest mb-2">2. Data Engineering & Sanitization Pipeline</h3>
                <p>This decentralized ingestion naturally produced high volumes of phonetic noise and panic-induced duplication. To resolve this, we implemented a strict ETL (Extract, Transform, Load) pipeline utilizing PostgreSQL GIN Trigram indexes for probabilistic record linkage. This algorithmic approach allowed us to normalize strings, identify fuzzy clones, and consolidate thousands of fragmented identities safely without generating false positives.</p>
              </section>
              <section>
                <h3 className="font-bold text-black uppercase text-xs tracking-widest mb-2">3. Data Masking & Ethics</h3>
                <p>Original reporter nodes (volunteer phone numbers) and exact multimedia source vectors have been masked in this public release to protect citizens on the ground. Furthermore, mortality figures (Deceased) have been strictly excluded from this dataset, adhering to ICRC/OCHA standards that require official forensic verification.</p>
              </section>
              <section>
                <h3 className="font-bold text-black uppercase text-xs tracking-widest mb-2">4. Data Dictionary (Codebook)</h3>
                <ul className="list-disc pl-5 space-y-2 text-xs font-sans">
                  <li><strong>full_name:</strong> Sanitized and normalized identity string.</li>
                  <li><strong>identity_document:</strong> National ID (Nullified if the reported format was invalid to prevent identity clashes).</li>
                  <li><strong>last_reported_status:</strong> Categorical state (Missing, Located, Hospitalized).</li>
                  <li><strong>last_known_location:</strong> Last confirmed spatial data point or medical facility.</li>
                  <li><strong>data_source:</strong> Anonymized provenance (Verified Citizen Report, Public Health Network, OSINT).</li>
                  <li><strong>first_reported_utc / last_updated_utc:</strong> ISO 8601 Timestamps of the record lifecycle.</li>
                </ul>
              </section>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center text-xs text-gray-500 font-mono">
              <span>{t.pressModalFooterLeft}</span>
              <span>{t.legalCompany}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState('home');
  const [activeTab, setActiveTab] = useState('personas');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const LANGS = ['es', 'en', 'fi'];
  const [lang, setLang] = useState('es');
  const toggleLang = () => setLang(l => {
    const idx = LANGS.indexOf(l);
    return LANGS[(idx + 1) % LANGS.length];
  });

  const [incidentId, setIncidentId] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [hasMorePersonas, setHasMorePersonas] = useState(false);
  const [hasMoreZonas, setHasMoreZonas] = useState(false);
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem('enc_stats');
      if (cached) return JSON.parse(cached);
    } catch {}
    return { total: 91574, buscados: 30897, a_salvo: 35191, heridos: 25342 };
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFalsoPositivo, setIsFalsoPositivo] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  const [formPersona, setFormPersona] = useState({ nombreDesc: '', documento: '', estado: 'buscado', ubicacion: '', contacto: '' });
  const [formZona, setFormZona] = useState({ nombre: '', situacion: '', urgencia: 'alta', contacto: '' });

  const [formAportePersona, setFormAportePersona] = useState({ status: '', location_text: '', documento: '' });
  const [formAporteZona, setFormAporteZona] = useState({ urgency: '', situation: '' });

  const [historyLogs, setHistoryLogs] = useState([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosBanner, setShowIosBanner] = useState(() => {
    return localStorage.getItem('iosBannerDismissed') !== '1';
  });

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && window.navigator.standalone !== true;

  const dismissIosBanner = () => {
    localStorage.setItem('iosBannerDismissed', '1');
    setShowIosBanner(false);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const isScrolling = useRef(null);
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/incidents?slug=eq.terremoto-ve-2026&select=id`, { headers: HEADERS });
        const data = await res.json();
        if (data && data.length > 0) setIncidentId(data[0].id);
      } catch (err) {
        showNotification("Error de conexión. Trabajando offline.", true);
      }
    };
    initApp();
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!incidentId) return;
    if (!silent) setInitialLoading(true);
    setIsSyncing(true);
    try {
      const [resP, resZ] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/persons?incident_id=eq.${incidentId}&order=status_weight.asc,created_at.desc&limit=50`, { headers: HEADERS }),
        fetch(`${SUPABASE_URL}/rest/v1/zones?incident_id=eq.${incidentId}&order=created_at.desc&limit=50`, { headers: HEADERS }),
      ]);
      const dataP = await resP.json();
      const dataZ = await resZ.json();
      const listP = Array.isArray(dataP) ? dataP : [];
      const listZ = Array.isArray(dataZ) ? dataZ : [];
      setPersonas(listP);
      setZonas(listZ);
      setHasMorePersonas(listP.length === 50);
      setHasMoreZonas(listZ.length === 50);
    } catch (err) {
      console.error("Error obteniendo datos:", err);
    } finally {
      setInitialLoading(false);
      setIsSyncing(false);
    }
  }, [incidentId]);

  const fetchStats = useCallback(async () => {
    if (!incidentId) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_incident_stats`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ p_incident_id: incidentId })
      });
      const data = await res.json();
      if (data && data.total !== undefined) {
        setStats(data);
        try { localStorage.setItem('enc_stats', JSON.stringify(data)); } catch {}
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }, [incidentId]);

  useEffect(() => { if (incidentId) { fetchData(); fetchStats(); } }, [incidentId, fetchData, fetchStats]);

  useEffect(() => {
    if (!incidentId) return;
    const interval = setInterval(() => { if (!searchQueryRef.current.trim()) fetchData(true); fetchStats(); }, 30000);
    return () => clearInterval(interval);
  }, [incidentId, fetchData, fetchStats]);

  // Cargar historial al abrir detalles de perfil
  useEffect(() => {
    if (view === 'detail' && selectedItem) {
      fetch(`${SUPABASE_URL}/rest/v1/history_logs?record_id=eq.${selectedItem.id}&order=created_at.desc`, { headers: HEADERS })
        .then(res => res.json())
        .then(data => {
          setHistoryLogs(data || []);
          setShowFullHistory(false);
        })
        .catch(err => console.error("Error cargando historial:", err));
    }
  }, [view, selectedItem]);

  // Búsqueda server-side con debounce de 800 ms + AbortController
  useEffect(() => {
    if (!incidentId) return;
    const term = searchQuery.trim();
    const controller = new AbortController();
    const t = setTimeout(async () => {
      const normalizedTerm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const words = normalizedTerm.split(/\s+/).filter(w => w.length > 0);
      const nameConditions = words.map(w => `search_name.ilike.*${encodeURIComponent(w)}*`).join(',');
      const nameQuery = words.length > 1 ? `and(${nameConditions})` : nameConditions;
      const searchP = term
        ? `&or=(${nameQuery},document_id.ilike.*${encodeURIComponent(term)}*)`
        : '';
      const searchZ = term ? `&name=ilike.*${encodeURIComponent(term)}*` : '';
      if (term) setInitialLoading(true); else setIsSyncing(true);
      try {
        const [resP, resZ] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/persons?incident_id=eq.${incidentId}${searchP}&order=status_weight.asc,created_at.desc&limit=50`, { headers: HEADERS, signal: controller.signal }),
          fetch(`${SUPABASE_URL}/rest/v1/zones?incident_id=eq.${incidentId}${searchZ}&order=created_at.desc&limit=50`, { headers: HEADERS, signal: controller.signal }),
        ]);
        const dataP = await resP.json();
        const dataZ = await resZ.json();
        const listP = Array.isArray(dataP) ? dataP : [];
        const listZ = Array.isArray(dataZ) ? dataZ : [];
        setPersonas(listP);
        setZonas(listZ);
        setHasMorePersonas(listP.length === 50);
        setHasMoreZonas(listZ.length === 50);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Error en búsqueda:', err);
      } finally {
        if (!controller.signal.aborted) {
          setInitialLoading(false);
          setIsSyncing(false);
        }
      }
    }, 800);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchQuery, incidentId]);

  // Soft suggestion: detectar posibles duplicados al crear nueva persona
  useEffect(() => {
    if (view !== 'form_persona') {
      setSuggestions([]);
      setIsSuggestionsLoading(false);
      return;
    }
    const name = formPersona.nombreDesc.trim();
    if (name.length < 4) {
      setSuggestions([]);
      setIsSuggestionsLoading(false);
      return;
    }
    if (!incidentId) return;
    const controller = new AbortController();
    setIsSuggestionsLoading(true);
    const t = setTimeout(async () => {
      try {
        const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const words = normalized.split(/\s+/).filter(w => w.length > 0);
        const conditions = words.map(w => `search_name.ilike.*${encodeURIComponent(w)}*`).join(',');
        const nameQuery = words.length > 1 ? `and(${conditions})` : conditions;
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/persons?incident_id=eq.${incidentId}&or=(${nameQuery})&order=status_weight.asc,created_at.desc&limit=3`,
          { headers: HEADERS, signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsSuggestionsLoading(false);
      }
    }, 1000);
    return () => { clearTimeout(t); controller.abort(); };
  }, [formPersona.nombreDesc, view, incidentId]);

  const loadMorePersonas = useCallback(async () => {
    if (!incidentId) return;
    const term = searchQuery.trim();
    const normalizedTerm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const words = normalizedTerm.split(/\s+/).filter(w => w.length > 0);
    const nameConditions = words.map(w => `search_name.ilike.*${encodeURIComponent(w)}*`).join(',');
    const nameQuery = words.length > 1 ? `and(${nameConditions})` : nameConditions;
    const searchP = term
      ? `&or=(${nameQuery},document_id.ilike.*${encodeURIComponent(term)}*)`
      : '';
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/persons?incident_id=eq.${incidentId}${searchP}&order=status_weight.asc,created_at.desc&limit=50&offset=${personas.length}`,
        { headers: HEADERS }
      );
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setPersonas(prev => [...prev, ...list]);
      setHasMorePersonas(list.length === 50);
    } catch (err) {
      console.error('Error cargando más personas:', err);
    }
  }, [incidentId, personas.length, searchQuery]);

  const loadMoreZonas = useCallback(async () => {
    if (!incidentId) return;
    const term = searchQuery.trim();
    const searchZ = term ? `&name=ilike.*${encodeURIComponent(term)}*` : '';
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/zones?incident_id=eq.${incidentId}${searchZ}&order=created_at.desc&limit=50&offset=${zonas.length}`,
        { headers: HEADERS }
      );
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setZonas(prev => [...prev, ...list]);
      setHasMoreZonas(list.length === 50);
    } catch (err) {
      console.error('Error cargando más zonas:', err);
    }
  }, [incidentId, zonas.length, searchQuery]);

  const showNotification = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // ─── CROWD-CORRECTION: Falso Positivo ───
  const handleFalsoPositivo = async () => {
    if (!selectedItem) return;
    setIsFalsoPositivo(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reportar_falso_positivo`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ p_person_id: selectedItem.id })
      });
      if (!res.ok) throw new Error();

      // Optimistic UI: actualizar estado local inmediatamente
      const updatedItem = {
        ...selectedItem,
        status: 'buscado',
        location_text: 'Desconocida (Ubicación descartada por familiar en el sitio)'
      };
      setSelectedItem(updatedItem);
      setPersonas(prev => prev.map(p => p.id === updatedItem.id ? updatedItem : p));
      showNotification(lang === 'es' ? 'Ubicación reportada. Se notificó a los familiares suscritos.' : 'Location reported. Subscribed family members were notified.');
    } catch {
      showNotification(T[lang].falsoPositivoError, true);
    } finally {
      setIsFalsoPositivo(false);
    }
  };

  const goBack = useCallback(() => {
    setView(prev => {
      switch (prev) {
        case 'personas':
        case 'zonas': return 'home';
        case 'detail': return activeTab;
        case 'form_persona': return 'personas';
        case 'form_zona': return 'zonas';
        case 'form_aporte_persona':
        case 'form_aporte_zona': return 'detail';
        default: return prev;
      }
    });
  }, [activeTab]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.targetTouches[0];
    if (!touch) return;
    if (e.target.closest('button, a, input, textarea, select')) return;
    swipeStartX.current = touch.clientX;
    swipeStartY.current = touch.clientY;
    isScrolling.current = null;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (swipeStartX.current === null) return;
    const touch = e.targetTouches[0];
    const deltaX = touch.clientX - swipeStartX.current;
    const deltaY = touch.clientY - swipeStartY.current;
    if (isScrolling.current === null) {
      isScrolling.current = Math.abs(deltaY) > Math.abs(deltaX);
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (swipeStartX.current === null) return;
    if (isScrolling.current) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      isScrolling.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX.current;
    const startedFromLeft = swipeStartX.current < 60;
    if (startedFromLeft && deltaX > 60 && view !== 'home') goBack();
    swipeStartX.current = null;
    swipeStartY.current = null;
    isScrolling.current = null;
  }, [view, goBack]);

  const handleTouchCancel = useCallback(() => {
    swipeStartX.current = null;
    swipeStartY.current = null;
    isScrolling.current = null;
  }, []);

  // ─── LÓGICA DE ENVÍO (CREAR) ───
  const handleSubmitPersona = async (e) => {
    e.preventDefault();
    if (!incidentId) return;
    setIsSubmitting(true);
    try {
      const payload = {
        incident_id: incidentId,
        name_desc: formPersona.nombreDesc,
        document_id: formPersona.documento || null,
        status: formPersona.estado,
        location_text: formPersona.ubicacion,
        reporter_contact: formPersona.contacto || "No especificado",
        trust_level: 0
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/persons`, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const newData = await res.json();
      const newRecord = newData[0];

      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: newRecord.id,
          table_name: 'persons',
          action: 'CREADO',
          details: `Reporte inicial. Estado: ${formPersona.estado.toUpperCase()}.${formPersona.documento ? ` Cédula: ${formPersona.documento}.` : ''} Ubicación: ${formPersona.ubicacion}`
        })
      }).catch(console.error);

      setPersonas(prev => [newRecord, ...prev]);
      setFormPersona({ nombreDesc: '', documento: '', estado: 'buscado', ubicacion: '', contacto: '' });
      showNotification("Reporte publicado exitosamente");
      setSelectedItem(newRecord);
      setActiveTab('personas');
      setView('detail');
      setShowSuccessModal(true);
    } catch { showNotification("Error de red. Intente de nuevo.", true); } finally { setIsSubmitting(false); }
  };

  const handleSubmitZona = async (e) => {
    e.preventDefault();
    if (!incidentId) return;
    setIsSubmitting(true);
    try {
      const payload = {
        incident_id: incidentId,
        name: formZona.nombre,
        urgency: formZona.urgencia,
        situation: formZona.situacion,
        reporter_contact: formZona.contacto || "No especificado",
        trust_level: 0
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/zones`, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const newData = await res.json();
      const newRecord = newData[0];

      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: newRecord.id,
          table_name: 'zones',
          action: 'CREADO',
          details: `Foco reportado. Urgencia: ${formZona.urgencia.toUpperCase()}. Situación: ${formZona.situacion}`
        })
      }).catch(console.error);

      setZonas(prev => [newRecord, ...prev]);
      setFormZona({ nombre: '', situacion: '', urgencia: 'alta', contacto: '' });
      showNotification("Zona de emergencia reportada");
      setSelectedItem(newRecord);
      setActiveTab('zonas');
      setView('detail');
      setShowSuccessModal(true);
    } catch { showNotification("Error de red. Intente de nuevo.", true); } finally { setIsSubmitting(false); }
  };

  // ─── LÓGICA DE ACTUALIZACIÓN (PATCH) ───
  const handleAportarPersona = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        status: formAportePersona.status,
        location_text: formAportePersona.location_text
      };
      if (formAportePersona.documento) {
        payload.document_id = formAportePersona.documento;
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/persons?id=eq.${selectedItem.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      const updatedData = await res.json();
      const updatedRecord = updatedData[0];

      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: selectedItem.id,
          table_name: 'persons',
          action: 'ACTUALIZADO',
          details: `Nuevo Estado: ${formAportePersona.status.toUpperCase()}.${formAportePersona.documento ? ` Cédula asignada: ${formAportePersona.documento}.` : ''} Nueva Ubicación: ${formAportePersona.location_text}`
        })
      }).catch(console.error);

      setPersonas(prev => prev.map(p => p.id === updatedRecord.id ? updatedRecord : p));
      setSelectedItem(updatedRecord);
      showNotification("Información actualizada correctamente");
      setView('detail');
    } catch { showNotification("Error al actualizar.", true); } finally { setIsSubmitting(false); }
  };

  const handleAportarZona = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/zones?id=eq.${selectedItem.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(formAporteZona)
      });
      if (!res.ok) throw new Error();
      const updatedData = await res.json();
      const updatedRecord = updatedData[0];

      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: selectedItem.id,
          table_name: 'zones',
          action: 'ACTUALIZADO',
          details: `Nueva Urgencia: ${formAporteZona.urgency.toUpperCase()}. Evolución: ${formAporteZona.situation}`
        })
      }).catch(console.error);

      setZonas(prev => prev.map(z => z.id === updatedRecord.id ? updatedRecord : z));
      setSelectedItem(updatedRecord);
      showNotification("Información actualizada correctamente");
      setView('detail');
    } catch { showNotification("Error al actualizar.", true); } finally { setIsSubmitting(false); }
  };

  // ─────────────────────────────────────────────
  // RENDERS DE VISTA INTERNA
  // ─────────────────────────────────────────────

  const HomeView = () => {
    return (
      <div className="flex flex-col h-full gap-4 animate-fade-in">
        <div className="bg-black text-white p-6 pb-8">
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-black tracking-tight mb-2 leading-none">{T[lang].homeTitle}</h2>
            <div className="flex items-center gap-2">
              {isSyncing && <RefreshCw size={16} className="animate-spin text-gray-500 mt-1" />}
              <button onClick={toggleLang} className="flex items-center gap-1 bg-gray-800 px-2 py-1 text-xs font-bold uppercase rounded active:scale-95 transition-transform">
                <Globe size={14}/> {LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length].toUpperCase()}
              </button>
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium mt-1 mb-5">{T[lang].homeSubtitle}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t-2 border-gray-800 pt-4">
            <div className="flex flex-col">
              <span className="text-2xl font-black">{stats.total.toLocaleString()}</span>
              <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">{T[lang].statsReports}</span>
            </div>
            <div className="flex flex-col border-l-2 border-gray-800 pl-3">
              <span className="text-2xl font-black text-red-500">{stats.buscados.toLocaleString()}</span>
              <span className="text-[9px] text-red-500/80 uppercase font-bold tracking-widest">{T[lang].statsMissing}</span>
            </div>
            <div className="flex flex-col border-t-2 border-gray-800 pt-3 sm:pt-0 sm:border-t-0 sm:border-l-2 sm:pl-3">
              <span className="text-2xl font-black text-green-500">{stats.a_salvo.toLocaleString()}</span>
              <span className="text-[9px] text-green-500/80 uppercase font-bold tracking-widest">{T[lang].statsSafe}</span>
            </div>
            <div className="flex flex-col border-l-2 border-t-2 border-gray-800 pl-3 pt-3 sm:pt-0 sm:border-t-0">
              <span className="text-2xl font-black text-orange-500">{stats.heridos.toLocaleString()}</span>
              <span className="text-[9px] text-orange-500/80 uppercase font-bold tracking-widest">{T[lang].statsInjured}</span>
            </div>
          </div>
        </div>

        {installPrompt && (
          <div className="bg-black border-t-2 border-gray-800 px-6 pb-6 pt-4">
            <button
              onClick={handleInstallApp}
              className="w-full bg-white text-black font-black p-3 text-sm tracking-widest uppercase hover:bg-gray-100 border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-none transition-all"
            >
              INSTALAR EN ESTE DISPOSITIVO
            </button>
          </div>
        )}

        {isIos && showIosBanner && !installPrompt && (
          <div className="bg-black border-t-2 border-gray-800 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <p className="text-gray-400 text-[11px] leading-snug">
                Para instalar abre en <span className="text-white font-bold">Safari</span>, toca Compartir y selecciona <span className="text-white font-bold">Añadir a pantalla de inicio</span>.
              </p>
              <button
                onClick={dismissIosBanner}
                className="text-gray-600 hover:text-white font-bold flex-shrink-0 leading-none text-base"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="px-4 flex flex-col gap-4 -mt-6">
          <button onClick={() => setView('personas')} className="bg-white p-6 border-4 border-black hover:bg-gray-50 flex flex-col items-start gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px]">
            <User size={32} className="mb-2" />
            <div className="flex justify-between w-full items-center">
              <h3 className="text-2xl font-black tracking-tight">{T[lang].persons}</h3>
              <span className="bg-black text-white text-xs px-2 py-1 font-bold">{stats.total.toLocaleString()} regs</span>
            </div>
            <p className="text-left text-sm text-gray-600 font-medium">{T[lang].personsDesc}</p>
            <div className="w-full mt-1 pt-3 border-t-2 border-black flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-[0.15em] text-blue-600">{lang === 'es' ? 'BUSCAR AHORA' : 'SEARCH NOW'}</span>
              <ChevronRight size={18} strokeWidth={3} className="text-blue-600" />
            </div>
          </button>
          {/* Focos de Rescate — oculto por decisión estratégica de UX (sin uso activo aún)
          <button onClick={() => setView('zonas')} className="bg-red-600 text-white p-6 border-4 border-black hover:bg-red-700 flex flex-col items-start gap-2 transition-transform active:scale-[0.98]">
            <Map size={32} className="mb-2" />
            <div className="flex justify-between w-full items-center">
              <h3 className="text-2xl font-black tracking-tight">{T[lang].zones}</h3>
              <span className="bg-white text-red-600 text-xs px-2 py-1 font-black">{zonas.length} regs</span>
            </div>
            <p className="text-left text-sm text-red-100 font-medium">{T[lang].zonesDesc}</p>
          </button>
          */}
        </div>

        <div className="mx-4 mb-6 mt-4 bg-gray-200 border-4 border-gray-300 p-5 space-y-4">
          <h4 className="font-black text-lg tracking-tight text-gray-900 leading-tight">
            {T[lang].footerTitle}
          </h4>
          <p className="text-sm font-medium text-gray-700 leading-snug">
            {T[lang].footerDesc}
          </p>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 items-start">
              <ImageOff size={18} className="text-gray-900 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-black text-sm text-gray-900">{T[lang].footerTechTitle}</span>
                <span className="text-xs font-medium text-gray-700">{T[lang].footerTechDesc}</span>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Users size={18} className="text-gray-900 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-black text-sm text-gray-900">{T[lang].footerColabTitle}</span>
                <span className="text-xs font-medium text-gray-700">{T[lang].footerColabDesc}</span>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <ShieldCheck size={18} className="text-gray-900 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-black text-sm text-gray-900">{T[lang].footerDataTitle}</span>
                <span className="text-xs font-medium text-gray-700">{T[lang].footerDataDesc}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 pb-8 border-t-2 border-gray-300 text-center flex flex-col items-center justify-center opacity-70">
          <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{T[lang].legalCompany}</span>
          <span className="text-[10px] font-bold text-gray-600 tracking-wider mt-0.5">{T[lang].legalRNC}</span>
          <span className="text-[10px] font-medium text-gray-500 mt-2">{T[lang].legalHumanitarian}</span>
          <span className="text-[10px] font-mono text-gray-400 mt-1">{T[lang].legalCopyright}</span>
          <button
            onClick={() => setView('press')}
            className="mt-4 text-[10px] text-gray-400 hover:text-gray-600 font-mono underline underline-offset-2 transition-colors"
          >
            {T[lang].pressMenu}
          </button>
        </div>
      </div>
    );
  };

  const DashboardView = ({ type }) => {
    const isPersonas = type === 'personas';
    const data = isPersonas ? personas : zonas;
    const hasMore = isPersonas ? hasMorePersonas : hasMoreZonas;
    const loadMore = isPersonas ? loadMorePersonas : loadMoreZonas;

    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="bg-black p-4 sticky top-0 z-10 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center gap-3 text-white">
            <button onClick={() => { setSearchQuery(''); setView('home'); }} className="p-1 -ml-2 hover:bg-gray-800 rounded-full transition-colors active:scale-90">
              <ChevronLeft size={32} />
            </button>
            <h2 className="text-xl font-black flex items-center tracking-tight gap-2 flex-1 truncate">
              {isPersonas ? <User size={20}/> : <Map size={20}/>}
              {isPersonas ? T[lang].dashPersons : T[lang].dashZones}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={toggleLang} className="flex items-center gap-1 bg-gray-800 px-2 py-1 text-xs font-bold uppercase rounded active:scale-95 transition-transform">
                <Globe size={12}/> {LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length].toUpperCase()}
              </button>
              {isSyncing && <RefreshCw size={14} className="animate-spin text-gray-500" />}
            </div>
          </div>
          <input type="text" placeholder={isPersonas ? T[lang].searchPlaceholderP : T[lang].searchPlaceholderZ} className="w-full p-3 text-black font-medium focus:outline-none border-b-2 border-gray-300 focus:border-blue-500 transition-colors" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <button onClick={() => setView(isPersonas ? 'form_persona' : 'form_zona')} className="w-full bg-blue-600 text-white font-bold p-3 uppercase tracking-wide hover:bg-blue-700 flex justify-center items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,100,0.5)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
            <Plus size={18}/> {isPersonas ? T[lang].btnNewPerson : T[lang].btnNewZone}
          </button>
        </div>
        <div className="p-4 space-y-4 bg-gray-100 min-h-screen">
          {initialLoading ? (
            <p className="text-center font-bold text-gray-500 py-10 animate-pulse">{T[lang].loading}</p>
          ) : data.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="font-bold text-gray-500 mb-2">
                {searchQuery ? `${T[lang].noResults} "${searchQuery}".` : T[lang].noRecords}
              </p>
              {searchQuery && (
                <p className="text-sm text-gray-600 font-medium">{T[lang].noResultsHint}</p>
              )}
            </div>
          ) : (
            <>
              {data.map(item =>
                isPersonas
                  ? <PersonaCard key={item.id} item={item} lang={lang} onClick={() => { setSelectedItem(item); setActiveTab(type); setView('detail'); }} />
                  : <ZonaCard key={item.id} item={item} lang={lang} onClick={() => { setSelectedItem(item); setActiveTab(type); setView('detail'); }} />
              )}
              {hasMore && (
                <div className="pt-2 pb-6 px-1">
                  <p className="text-center text-xs font-bold text-gray-500 mb-3">{T[lang].loadMoreHint}</p>
                  <button
                    onClick={loadMore}
                    className="w-full bg-black text-white font-black uppercase p-4 hover:bg-gray-800 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex justify-center items-center gap-2"
                  >
                    <ChevronDown size={20} /> {T[lang].loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const DetailView = () => {
    if (!selectedItem) return null;
    const isPersona = activeTab === 'personas';

    // Condición para mostrar el botón de Crowd-Correction
    const mostrarFalsoPositivo = isPersona
      && (selectedItem.status === 'herido' || selectedItem.status === 'a_salvo')
      && selectedItem.trust_level === 0;

    return (
      <div className="bg-gray-100 min-h-screen animate-fade-in pb-20">
        <div className="bg-black text-white p-4 sticky top-0 flex items-center gap-3 z-10 shadow-lg">
          <button onClick={goBack} className="p-1 -ml-2 hover:bg-gray-800 rounded-full transition-colors active:scale-90">
            <ChevronLeft size={32} />
          </button>
          <span className="font-black text-lg truncate tracking-tight flex-1">{T[lang].detailTitle}</span>
          <span className="text-xs font-mono font-bold opacity-50 truncate w-20 text-right">{selectedItem.id?.split('-')[0]}</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-white border-4 border-black p-5">
            <div className="flex flex-col items-start gap-3 mb-4">
              <TrustBadge level={selectedItem.trust_level} />
              {isPersona
                ? <StatusPill status={selectedItem.status} lang={lang} />
                : <span className={`text-xs px-2 py-1 font-bold uppercase text-white ${selectedItem.urgency === 'alta' ? 'bg-red-600' : 'bg-orange-500'}`}>
                    {selectedItem.urgency === 'alta' ? T[lang].detailUrgencyHigh : T[lang].detailUrgencyMed}
                  </span>
              }
            </div>

            <h2 className="text-2xl font-black mb-2 leading-tight border-b-2 border-gray-100 pb-2">
              {isPersona ? selectedItem.name_desc : selectedItem.name}
            </h2>
            {isPersona && selectedItem.document_id && (
              <p className="text-sm font-mono font-black text-gray-600 mb-4 bg-gray-50 p-2 border border-gray-200 w-max">{T[lang].detailDoc} {selectedItem.document_id}</p>
            )}

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 tracking-wider mb-1">{isPersona ? T[lang].detailLocation : T[lang].detailSituation}</p>
                <p className="font-medium text-lg leading-snug">{isPersona ? selectedItem.location_text : selectedItem.situation}</p>
              </div>

              {/* ─── CROWD-CORRECTION: Botón Falso Positivo ───
                  Solo visible para personas heridas/a_salvo con trust_level 0 (datos de extracción masiva).
                  Diseño secundario (outline) para no competir visualmente con las acciones principales.
              */}
              {mostrarFalsoPositivo && (
                <button
                  onClick={handleFalsoPositivo}
                  disabled={isFalsoPositivo}
                  className="w-full border-2 border-orange-600 text-orange-700 bg-transparent font-bold text-sm p-3 uppercase tracking-wide hover:bg-orange-50 disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(180,60,0,0.3)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
                >
                  {isFalsoPositivo ? T[lang].btnFalsoPositivoSending : T[lang].btnFalsoPositivo}
                </button>
              )}

              <div className="bg-gray-50 p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-500 tracking-wider mb-1">{T[lang].detailContact}</p>
                <p className="font-bold">{selectedItem.reporter_contact}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase">Reg: {formatDateTime(selectedItem.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Enlace Inteligente a Telegram */}
          <a
            href={`https://t.me/red_emergencia_bot?start=${isPersona ? 'person' : 'zone'}_${selectedItem.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-600 text-white font-black uppercase p-4 hover:bg-blue-700 flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,100,0.5)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            <Bell size={18}/> {T[lang].btnTelegram}
          </a>

          {/* Botón de Aportar Información */}
          <button
            onClick={() => {
              if (isPersona) {
                setFormAportePersona({ status: selectedItem.status, location_text: selectedItem.location_text, documento: selectedItem.document_id || '' });
                setView('form_aporte_persona');
              } else {
                setFormAporteZona({ urgency: selectedItem.urgency, situation: selectedItem.situation });
                setView('form_aporte_zona');
              }
            }}
            className="w-full bg-black text-white font-black uppercase p-4 hover:bg-gray-800 flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          >
            <Edit3 size={18}/> {T[lang].btnContribute}
          </button>

          {/* Historial de Revisiones */}
          <div className="bg-white border-4 border-black p-4 shadow-sm">
            <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2 text-sm border-b-2 border-gray-100 pb-2">
              <Clock size={16}/> {T[lang].historyTitle}
            </h3>
            {historyLogs.length === 0 ? (
              <p className="text-xs text-gray-500 font-mono text-center py-2">{T[lang].historyEmpty}</p>
            ) : (
              <div className="space-y-3">
                {(showFullHistory ? historyLogs : historyLogs.slice(0, 3)).map(log => (
                  <div key={log.id} className="border-l-4 border-black pl-3 ml-1 py-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase">{formatDateTime(log.created_at)}</p>
                    <p className={`text-xs font-bold uppercase ${log.action === 'CREADO' ? 'text-blue-600' : 'text-green-600'}`}>{log.action}</p>
                    <p className="text-sm font-medium leading-snug">{log.details}</p>
                  </div>
                ))}
                {historyLogs.length > 3 && (
                  <button onClick={() => setShowFullHistory(!showFullHistory)} className="w-full bg-gray-100 hover:bg-gray-200 text-black font-bold uppercase text-xs p-3 mt-2 transition-colors border-2 border-transparent active:border-black">
                    {showFullHistory ? T[lang].historyHide : T[lang].historyMore.replace('{n}', historyLogs.length - 3)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const FormPersonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-black text-white p-4 sticky top-0 flex items-center gap-3 shadow-md z-10">
        <button onClick={() => setView('personas')} className="p-1 -ml-2 hover:bg-white/20 rounded-full transition-colors active:scale-90">
          <ChevronLeft size={32} />
        </button>
        <h2 className="font-black text-lg flex-1 truncate tracking-tight">{T[lang].formPersonaTitle}</h2>
      </div>
      <form onSubmit={handleSubmitPersona} className="p-4 space-y-5">
        <div className="bg-yellow-400 text-black p-3 text-xs font-bold uppercase tracking-wide border-2 border-black">{T[lang].formPersonaWarning}</div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formPersonaLabel1}</label>
          <input required type="text" placeholder={T[lang].formPersonaPlaceholder1} className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formPersona.nombreDesc} onChange={e => setFormPersona(f => ({...f, nombreDesc: e.target.value}))} />
        </div>
        {(isSuggestionsLoading || suggestions.length > 0) && (
          <div className="border-2 border-gray-300 bg-gray-50 p-3 -mt-3">
            <p className="text-[10px] font-black text-gray-600 mb-2">
              ¿Es a quien buscas? Toca 'Ver', o ignora y continúa.
            </p>
            {isSuggestionsLoading ? (
              <p className="text-xs text-gray-400 font-mono py-1">Buscando...</p>
            ) : (
              <div className="space-y-1.5">
                {suggestions.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 truncate flex-1">{s.name_desc}</span>
                      <StatusPill status={s.status} lang={lang} />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSuggestions([]); setSearchQuery(s.name_desc); setView('personas'); }}
                      className="text-xs font-black text-blue-600 uppercase border-2 border-blue-600 px-2 py-1 flex-shrink-0 hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formPersonaLabel2}</label>
          <input type="text" placeholder={T[lang].formPersonaPlaceholder2} className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500 font-mono" value={formPersona.documento} onChange={e => setFormPersona(f => ({...f, documento: e.target.value}))} />
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formPersonaLabel3}</label>
          <div className="grid grid-cols-2 gap-2">
            {[['buscado', T[lang].statusBuscado], ['a_salvo', T[lang].statusASalvo], ['herido', T[lang].statusHerido], ['fallecido', T[lang].statusFallecido]].map(([s, label]) => (<button key={s} type="button" onClick={() => setFormPersona(f => ({...f, estado: s}))} className={`p-3 font-bold uppercase text-xs border-2 transition-colors ${formPersona.estado === s ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>{label}</button>))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formPersonaLabel4}</label>
          <input required type="text" placeholder={T[lang].formPersonaPlaceholder4} className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formPersona.ubicacion} onChange={e => setFormPersona(f => ({...f, ubicacion: e.target.value}))} />
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formPersonaLabel5}</label>
          <input type="tel" placeholder={T[lang].formPersonaPlaceholder5} className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500 font-mono" value={formPersona.contacto} onChange={e => setFormPersona(f => ({...f, contacto: e.target.value}))} />
        </div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 text-white font-black text-lg p-5 mt-4 uppercase hover:bg-blue-700 disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,100,0.5)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">{isSubmitting ? T[lang].btnSaving : T[lang].btnPublish}</button>
      </form>
    </div>
  );

  const FormZonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-red-600 text-white p-4 sticky top-0 flex items-center gap-3 shadow-md z-10">
        <button onClick={() => setView('zonas')} className="p-1 -ml-2 hover:bg-white/20 rounded-full transition-colors active:scale-90">
          <ChevronLeft size={32} />
        </button>
        <h2 className="font-black text-lg flex-1 truncate tracking-tight">{T[lang].formZonaTitle}</h2>
      </div>
      <form onSubmit={handleSubmitZona} className="p-4 space-y-5">
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formZonaLabel1}</label>
          <input required type="text" placeholder={T[lang].formZonaPlaceholder1} className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500" value={formZona.nombre} onChange={e => setFormZona(f => ({...f, nombre: e.target.value}))} />
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formZonaLabel2}</label>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setFormZona({...formZona, urgencia: 'alta'})} className={`p-3 font-bold uppercase text-xs border-2 ${formZona.urgencia === 'alta' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>{T[lang].formZonaBtnAlta}</button>
            <button type="button" onClick={() => setFormZona({...formZona, urgencia: 'media'})} className={`p-3 font-bold uppercase text-xs border-2 ${formZona.urgencia === 'media' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>{T[lang].formZonaBtnMedia}</button>
            <button type="button" onClick={() => setFormZona({...formZona, urgencia: 'baja'})} className={`p-3 font-bold uppercase text-xs border-2 ${formZona.urgencia === 'baja' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>{T[lang].formZonaBtnBaja}</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formZonaLabel3}</label>
          <textarea required rows="4" placeholder={T[lang].formZonaPlaceholder3} className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500 resize-none" value={formZona.situacion} onChange={e => setFormZona(f => ({...f, situacion: e.target.value}))} />
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formZonaLabel4}</label>
          <input type="tel" placeholder={T[lang].formZonaPlaceholder4} className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500 font-mono" value={formZona.contacto} onChange={e => setFormZona(f => ({...f, contacto: e.target.value}))} />
        </div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-red-600 text-white font-black text-lg p-5 mt-4 uppercase hover:bg-red-700 disabled:opacity-50 transition-opacity">{isSubmitting ? T[lang].btnAlertSending : T[lang].btnAlert}</button>
      </form>
    </div>
  );

  const FormAportePersonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-black text-white p-4 sticky top-0 flex items-center gap-3 shadow-md z-10">
        <button onClick={() => setView('detail')} className="p-1 -ml-2 hover:bg-white/20 rounded-full transition-colors active:scale-90">
          <ChevronLeft size={32} />
        </button>
        <h2 className="font-black text-lg flex-1 truncate tracking-tight">{T[lang].formAportePersonaTitle}</h2>
      </div>
      <form onSubmit={handleAportarPersona} className="p-4 space-y-5">
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formAporteLabel1}</label>
          <div className="grid grid-cols-2 gap-2">
            {[['buscado', T[lang].statusBuscado], ['a_salvo', T[lang].statusASalvo], ['herido', T[lang].statusHerido], ['fallecido', T[lang].statusFallecido]].map(([s, label]) => (
              <button key={s} type="button" onClick={() => setFormAportePersona({...formAportePersona, status: s})} className={`p-3 font-bold uppercase text-xs border-2 ${formAportePersona.status === s ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formAporteLabel2}</label>
          <input type="text" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500 font-mono" value={formAportePersona.documento || ''} onChange={e => setFormAportePersona({...formAportePersona, documento: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formAporteLabel3}</label>
          <input required type="text" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formAportePersona.location_text} onChange={e => setFormAportePersona({...formAportePersona, location_text: e.target.value})} />
        </div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 text-white font-black text-lg p-5 mt-4 uppercase">
          {isSubmitting ? T[lang].btnSaving : T[lang].btnUpdate}
        </button>
      </form>
    </div>
  );

  const FormAporteZonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-red-600 text-white p-4 sticky top-0 flex items-center gap-3 shadow-md z-10">
        <button onClick={() => setView('detail')} className="p-1 -ml-2 hover:bg-white/20 rounded-full transition-colors active:scale-90">
          <ChevronLeft size={32} />
        </button>
        <h2 className="font-black text-lg flex-1 truncate tracking-tight">{T[lang].formAporteZonaTitle}</h2>
      </div>
      <form onSubmit={handleAportarZona} className="p-4 space-y-5">
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formAporteZonaLabel1}</label>
          <div className="grid grid-cols-3 gap-2">
            {[['alta', T[lang].urgencyAlta], ['media', T[lang].urgencyMedia], ['baja', T[lang].urgencyBaja]].map(([u, label]) => (
              <button key={u} type="button" onClick={() => setFormAporteZona({...formAporteZona, urgency: u})} className={`p-3 font-bold uppercase text-xs border-2 ${formAporteZona.urgency === u ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-black mb-2 text-gray-800">{T[lang].formAporteZonaLabel2}</label>
          <textarea required rows="4" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500 resize-none" value={formAporteZona.situation} onChange={e => setFormAporteZona({...formAporteZona, situation: e.target.value})}></textarea>
        </div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-red-600 text-white font-black text-lg p-5 mt-4 uppercase">
          {isSubmitting ? T[lang].btnSaving : T[lang].btnUpdateZone}
        </button>
      </form>
    </div>
  );

  // ─── RENDER PRINCIPAL ───
  return (
    <div
      className="max-w-md mx-auto bg-gray-100 min-h-screen font-sans relative overflow-hidden shadow-2xl border-x-4 border-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {notification && (
        <div className={`absolute top-0 left-0 right-0 z-50 p-4 animate-slide-down ${notification.isError ? 'bg-red-600' : 'bg-black'} text-white`}>
          <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-wide">
            {notification.isError ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>}
            {notification.msg}
          </div>
        </div>
      )}

      {view === 'home'                 && HomeView()}
      {view === 'personas'             && DashboardView({ type: 'personas' })}
      {view === 'zonas'                && DashboardView({ type: 'zonas' })}
      {view === 'detail'               && DetailView()}
      {view === 'form_persona'         && FormPersonaView()}
      {view === 'form_zona'            && FormZonaView()}
      {view === 'form_aporte_persona'  && FormAportePersonaView()}
      {view === 'form_aporte_zona'     && FormAporteZonaView()}
      {view === 'press'                && <PressView setView={setView} incidentId={incidentId} lang={lang} />}

      {/* MODAL DE ÉXITO — TELEGRAM */}
      {showSuccessModal && selectedItem && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 animate-slide-up">
            <div className="flex items-center gap-2 text-blue-600 font-black text-lg border-b-4 border-black pb-2">
              <Bell size={24} className="animate-bounce" />
              <span>{T[lang].modalTitle}</span>
            </div>
            <p className="text-sm font-bold text-gray-800 leading-snug">
              {T[lang].modalDesc} <span className="underline font-black">{selectedItem.name_desc || selectedItem.name}</span>?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`https://t.me/red_emergencia_bot?start=${activeTab === 'personas' ? 'person' : 'zone'}_${selectedItem.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-blue-600 text-white font-black uppercase p-4 hover:bg-blue-700 text-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Bell size={16}/> {T[lang].modalBtnTelegram}
              </a>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-white text-black font-black uppercase p-3 hover:bg-gray-100 text-center border-2 border-black text-xs"
              >
                {T[lang].modalBtnSkip}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}