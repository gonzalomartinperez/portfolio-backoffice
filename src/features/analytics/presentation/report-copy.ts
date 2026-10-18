import type { Region } from "../domain/report.ts";

const en = {
	description: "Website activity, with clear periods and collection limits.",
	calendar: "Calendar report",
	legacy: "Seven-day event details",
	scope:
		"Received events, not unique visitors. Blockers, failed delivery and quotas can leave gaps. No visitor identity or conversation content is collected here.",
	filters: "Report filters",
	periodFilters: "Period and language · all pages",
	gridFilters: "Interaction grid · selected page and layout",
	period: "Calendar period",
	periods: { day: "UTC day", week: "ISO week", month: "Calendar month" },
	offset: "Period selection",
	offsets: ["Current period", "Previous period", "Two periods ago"],
	eventLocale: "Event language",
	languages: { all: "Both languages", en: "English", es: "Español" },
	page: "Grid page",
	region: "Public region",
	viewport: "Grid viewport",
	viewports: { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop" },
	apply: "Apply filters",
	filterScope:
		"Period and language apply to the full report. Page, region and viewport apply only to region activity and the click grid.",
	invalid: "These filters are not supported",
	invalidBody:
		"Choose a reviewed page, region and calendar period. No private source was requested with these filters.",
	reset: "Reset filters",
	range: (start: string, end: string) =>
		`${start} to ${end} · UTC, end date excluded`,
	partial: "Current period · still in progress",
	past: "Past calendar period · collection may have gaps",
	allPages: "All pages · selected period and language",
	views: "Page views",
	clicks: "Public pointer clicks",
	exposures: "Section exposures",
	viewsHelp:
		"Accepted page-view events after duplicate suppression; not people.",
	clicksHelp: "Clicks in reviewed public regions, across viewport buckets.",
	exposuresHelp:
		"Bounded targets visible for at least 500 ms; not proof of reading.",
	daily: "Page views by UTC day",
	dailyHelp:
		"Only days with received page views are shown. Missing days do not prove zero traffic.",
	dailyTable: "Received page views by UTC day",
	countries: "Request countries",
	country: "Country bucket",
	countryHelp:
		"Coarse server-assigned request location, not nationality. Small known-country buckets are withheld.",
	countryOff:
		"Country collection is off. Retained historical buckets may still appear.",
	countryOn:
		"Country headers are configured. This does not verify the effective edge/proxy trust chain.",
	unknown: "Unknown",
	withheld: "Withheld · small buckets",
	pages: "Activity across pages",
	grid: "Reviewed-region click grid",
	gridHelp:
		"An 8 × 8 grid relative to the selected region. Only cells with at least three clicks are published. Uncoloured cells have no publishable count; they are not measured zeroes.",
	gridTable: "Published grid cells · columns and rows numbered 1–8",
	column: "Column",
	row: "Row",
	gridEmpty: "No grid cell meets the publication threshold in this selection.",
	suppressed: "Clicks withheld from the grid",
	regionExposures: "Selected-region exposures",
	regions: "Activity in the selected page and viewport",
	actions: "Semantic actions · all pages",
	actionsHelp:
		"Opening a CV, contact or company link does not prove a download, sent message or completed navigation.",
	noActions: "No accepted semantic actions in this selection.",
	empty:
		"No accepted events in this selection. This does not establish complete collection.",
	coverage: "Coverage and interpretation",
	generated: "Report generated · UTC",
	first: "Earliest recorded boundary · UTC",
	last: "Latest recorded boundary · UTC",
	unobserved: "Not recorded",
	coverageHelp:
		"Aggregates retain 93 UTC days. Receipt boundaries are global and may predate retained data; legacy boundaries can have day precision. Enablement time and uninterrupted coverage are not recorded. The current-period label describes the calendar, not completeness.",
	dedupe:
		"Event UUID replay suppression lasts 24 hours. A replay after expiry can count again. Counts never represent unique people.",
};

const es: typeof en = {
	description:
		"Actividad del sitio, con períodos y límites de recolección claros.",
	calendar: "Reporte por calendario",
	legacy: "Detalle de eventos de siete días",
	scope:
		"Eventos recibidos, no visitantes únicos. Los bloqueadores, las entregas fallidas y las cuotas pueden dejar datos sin registrar. Aquí no se recolectan identidades de visitantes ni conversaciones.",
	filters: "Filtros del reporte",
	periodFilters: "Período e idioma · todas las páginas",
	gridFilters: "Cuadrícula de interacciones · página y diseño seleccionados",
	period: "Período del calendario",
	periods: { day: "Día UTC", week: "Semana ISO", month: "Mes calendario" },
	offset: "Selección del período",
	offsets: ["Período actual", "Período anterior", "Dos períodos atrás"],
	eventLocale: "Idioma de los eventos",
	languages: { all: "Ambos idiomas", en: "English", es: "Español" },
	page: "Página de la cuadrícula",
	region: "Región pública",
	viewport: "Tamaño de pantalla de la cuadrícula",
	viewports: { mobile: "Móvil", tablet: "Tableta", desktop: "Escritorio" },
	apply: "Aplicar filtros",
	filterScope:
		"El período y el idioma se aplican a todo el reporte. La página, la región y el tamaño de pantalla solo afectan la actividad por región y la cuadrícula de clics.",
	invalid: "Estos filtros no son compatibles",
	invalidBody:
		"Selecciona una página, una región y un período permitidos. No se consultó la fuente privada con estos filtros.",
	reset: "Restablecer filtros",
	range: (start: string, end: string) =>
		`${start} a ${end} · UTC, sin incluir la fecha final`,
	partial: "Período actual · todavía en curso",
	past: "Período calendario anterior · puede haber datos sin registrar",
	allPages: "Todas las páginas · período e idioma seleccionados",
	views: "Vistas de página",
	clicks: "Clics públicos del puntero",
	exposures: "Exposiciones de secciones",
	viewsHelp:
		"Eventos de vista de página aceptados tras eliminar duplicados; no son personas.",
	clicksHelp:
		"Clics en regiones públicas permitidas, en todos los tamaños de pantalla.",
	exposuresHelp:
		"Elementos acotados visibles durante al menos 500 ms; no demuestra lectura.",
	daily: "Vistas de página por día UTC",
	dailyHelp:
		"Solo se muestran días con vistas recibidas. Un día sin registros no demuestra que no hubo tráfico.",
	dailyTable: "Vistas de página recibidas por día UTC",
	countries: "Países de las solicitudes",
	country: "Grupo de país",
	countryHelp:
		"Ubicación aproximada de la solicitud asignada por el servidor, no nacionalidad. Los grupos pequeños de países conocidos se ocultan.",
	countryOff:
		"La recolección de país está desactivada. Pueden aparecer grupos históricos conservados.",
	countryOn:
		"Los encabezados de país están configurados. Esto no verifica la cadena efectiva de confianza del proxy y la red.",
	unknown: "Desconocido",
	withheld: "Oculto · grupos pequeños",
	pages: "Actividad entre páginas",
	grid: "Cuadrícula de clics de la región permitida",
	gridHelp:
		"Cuadrícula de 8 × 8 relativa a la región seleccionada. Solo se publican celdas con al menos tres clics. Las celdas sin color no tienen un conteo publicable; no son ceros medidos.",
	gridTable: "Celdas publicadas · columnas y filas numeradas de 1 a 8",
	column: "Columna",
	row: "Fila",
	gridEmpty:
		"Ninguna celda alcanza el mínimo para publicarse en esta selección.",
	suppressed: "Clics ocultos de la cuadrícula",
	regionExposures: "Exposiciones de la región seleccionada",
	regions: "Actividad en la página y el tamaño de pantalla seleccionados",
	actions: "Acciones semánticas · todas las páginas",
	actionsHelp:
		"Abrir un enlace al CV, a un contacto o a una empresa no demuestra una descarga, un mensaje enviado ni una navegación completada.",
	noActions: "No hay acciones semánticas aceptadas en esta selección.",
	empty:
		"No hay eventos aceptados en esta selección. Esto no demuestra una recolección completa.",
	coverage: "Cobertura e interpretación",
	generated: "Reporte generado · UTC",
	first: "Límite registrado más antiguo · UTC",
	last: "Límite registrado más reciente · UTC",
	unobserved: "Sin registro",
	coverageHelp:
		"Los agregados se conservan durante 93 días UTC. Los límites de recepción son globales y pueden ser anteriores a los datos conservados; los históricos pueden tener precisión de día. No se registran la fecha de habilitación ni una cobertura ininterrumpida. La etiqueta del período actual describe el calendario, no la integridad de los datos.",
	dedupe:
		"Los duplicados del UUID de evento se rechazan durante 24 horas. Una repetición posterior puede volver a contarse. Los conteos nunca representan personas únicas.",
};

export const reportCopy = { en, es };

const enRegions: Record<Region, string> = {
	"site-header": "Site header",
	"site-footer": "Site footer",
	"home-featured": "Featured work",
	"home-experience": "Experience overview",
	"home-about": "Profile overview",
	"home-education": "Education overview",
	"home-contact": "Contact overview",
	"about-story": "Professional story",
	"about-focus": "Current focus",
	"about-principles": "Working principles",
	"about-opportunities": "Opportunities",
	"work-rampy": "Rampy",
	"work-teamcubation": "Teamcubation",
	"work-cooperativa": "Cooperativa Obrera",
	"work-independent": "Independent work",
	"work-projects": "Selected projects",
	"filomena-problem": "Project problem",
	"filomena-approach": "Project approach",
	"filomena-outcomes": "Project outcomes",
	"filomena-evidence": "Project evidence",
	"stack-catalogue": "Technology catalogue",
	"stack-scope": "Technology scope",
	"education-degree": "Degree",
	"education-curriculum": "Curriculum",
	"education-credentials": "Credentials",
	"education-evidence": "Education evidence",
	"cv-downloads": "CV links",
	"cv-summary": "CV summary",
	"contact-channels": "Contact channels",
	"contact-resume": "Contact and CV",
};
const esRegions: typeof enRegions = {
	"site-header": "Encabezado del sitio",
	"site-footer": "Pie del sitio",
	"home-featured": "Trabajo destacado",
	"home-experience": "Resumen de experiencia",
	"home-about": "Resumen del perfil",
	"home-education": "Resumen de formación",
	"home-contact": "Resumen de contacto",
	"about-story": "Trayectoria profesional",
	"about-focus": "Enfoque actual",
	"about-principles": "Principios de trabajo",
	"about-opportunities": "Oportunidades",
	"work-rampy": "Rampy",
	"work-teamcubation": "Teamcubation",
	"work-cooperativa": "Cooperativa Obrera",
	"work-independent": "Trabajo independiente",
	"work-projects": "Proyectos seleccionados",
	"filomena-problem": "Problema del proyecto",
	"filomena-approach": "Enfoque del proyecto",
	"filomena-outcomes": "Resultados del proyecto",
	"filomena-evidence": "Evidencia del proyecto",
	"stack-catalogue": "Catálogo de tecnologías",
	"stack-scope": "Alcance de las tecnologías",
	"education-degree": "Carrera",
	"education-curriculum": "Plan de estudios",
	"education-credentials": "Credenciales",
	"education-evidence": "Evidencia de formación",
	"cv-downloads": "Enlaces al CV",
	"cv-summary": "Resumen del CV",
	"contact-channels": "Canales de contacto",
	"contact-resume": "Contacto y CV",
};
export const regionCopy = { en: enRegions, es: esRegions };
