"use client";

import { useId, useState } from "react";
import { Button } from "../../../shared/ui/button";
import { sections } from "../domain/models";
import {
	eventLocales,
	firstRegion,
	regionsFor,
	reportPeriods,
	reportViewports,
	type ReportSelection,
} from "../domain/report";
import { productCopy } from "./copy";
import { reportCopy, regionCopy } from "./report-copy";
import styles from "./report.module.css";

export function ReportFilters({
	selection,
	locale,
}: {
	selection: ReportSelection;
	locale: "en" | "es";
}) {
	const formId = useId();
	const [section, setSection] = useState(selection.section);
	const [region, setRegion] = useState(selection.region);
	const t = reportCopy[locale];
	return (
		<form
			action="/analytics"
			method="get"
			className={`operation-card ${styles.filters}`}
			aria-label={t.filters}
		>
			<input type="hidden" name="locale" value={locale} />
			<fieldset>
				<legend>{t.periodFilters}</legend>
				<div className={styles.fields}>
					<div className={styles.field}>
						<label htmlFor={`${formId}-period`}>{t.period}</label>
						<select
							id={`${formId}-period`}
							name="period"
							defaultValue={selection.period}
						>
							{reportPeriods.map((value) => (
								<option key={value} value={value}>
									{t.periods[value]}
								</option>
							))}
						</select>
					</div>
					<div className={styles.field}>
						<label htmlFor={`${formId}-offset`}>{t.offset}</label>
						<select
							id={`${formId}-offset`}
							name="offset"
							defaultValue={selection.offset}
						>
							{t.offsets.map((label, index) => (
								<option key={label} value={index}>
									{label}
								</option>
							))}
						</select>
					</div>
					<div className={styles.field}>
						<label htmlFor={`${formId}-eventLocale`}>{t.eventLocale}</label>
						<select
							id={`${formId}-eventLocale`}
							name="eventLocale"
							defaultValue={selection.eventLocale}
						>
							{eventLocales.map((value) => (
								<option key={value} value={value}>
									{t.languages[value]}
								</option>
							))}
						</select>
					</div>
				</div>
			</fieldset>
			<fieldset>
				<legend>{t.gridFilters}</legend>
				<div className={styles.fields}>
					<div className={styles.field}>
						<label htmlFor={`${formId}-section`}>{t.page}</label>
						<select
							id={`${formId}-section`}
							name="section"
							value={section}
							onChange={(event) => {
								const next = sections.find(
									(value) => value === event.target.value,
								);
								if (next) {
									setSection(next);
									setRegion(firstRegion(next));
								}
							}}
						>
							{sections.map((value) => (
								<option key={value} value={value}>
									{productCopy[locale].sections[value]}
								</option>
							))}
						</select>
					</div>
					<div className={styles.field}>
						<label htmlFor={`${formId}-region`}>{t.region}</label>
						<select
							id={`${formId}-region`}
							name="region"
							value={region}
							onChange={(event) => {
								const next = regionsFor(section).find(
									(value) => value === event.target.value,
								);
								if (next) setRegion(next);
							}}
						>
							{regionsFor(section).map((value) => (
								<option key={value} value={value}>
									{regionCopy[locale][value]}
								</option>
							))}
						</select>
					</div>
					<div className={styles.field}>
						<label htmlFor={`${formId}-viewport`}>{t.viewport}</label>
						<select
							id={`${formId}-viewport`}
							name="viewport"
							defaultValue={selection.viewport}
						>
							{reportViewports.map((value) => (
								<option key={value} value={value}>
									{t.viewports[value]}
								</option>
							))}
						</select>
					</div>
				</div>
			</fieldset>
			<div className={styles.filterFooter}>
				<p>{t.filterScope}</p>
				<Button type="submit" variant="default">
					{t.apply}
				</Button>
			</div>
		</form>
	);
}
