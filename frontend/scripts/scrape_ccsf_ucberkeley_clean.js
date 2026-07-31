const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DEBUG = process.env.DEBUG === 'true';
const rawDir = path.resolve(__dirname, '../data/raw/assist/debug_ccsf_ucberkeley_clean');
const outDir = path.resolve(__dirname, '../data/processed');
const outPath = path.join(outDir, 'assist_articulations.csv');

const SOURCE_COLLEGE = 'CCSF';
const TARGET_UNIVERSITY = 'UC Berkeley';

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

async function maybeDebug(page, name) {
  if (!DEBUG) return;
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  await page.screenshot({ path: path.join(rawDir, `${name}.png`), fullPage: true });
  fs.writeFileSync(path.join(rawDir, `${name}.html`), await page.content());
}

async function selectInstitution(page, labelIndex, optionMatcher, description) {
  const labels = await page.$$('label:has-text("Institution")');
  if (labels.length <= labelIndex) {
    throw new Error(`Could not find Institution label ${labelIndex} for ${description}`);
  }

  await labels[labelIndex].click();
  await page.waitForFunction(
    () => document.querySelectorAll('[role="option"]').length > 0,
    { timeout: 10000 }
  );

  for (const option of await page.$$('[role="option"]')) {
    const text = cleanText(await option.textContent());
    if (optionMatcher(text)) {
      await option.click();
      await page.keyboard.press('Escape');
      console.log(`Selected ${description}: ${text}`);
      return;
    }
  }

  throw new Error(`Could not select ${description}`);
}

async function getSelectedAcademicYear(page) {
  const headingText = await page
    .locator('.searchCriteria')
    .first()
    .textContent()
    .catch(() => '');
  const headingMatch = cleanText(headingText).match(/\b\d{4}-\d{4}\b/);
  if (headingMatch) return headingMatch[0];

  const bodyText = await page.locator('body').textContent().catch(() => '');
  const bodyMatch = cleanText(bodyText).match(/\b\d{4}-\d{4}\b/);
  return bodyMatch ? bodyMatch[0] : '';
}

async function getMajorNames(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const rows = [...document.querySelectorAll('.viewByRow')];
    const names = rows
      .map((row) => clean(row.querySelector('.viewByRowColText')?.textContent || row.textContent || ''))
      .filter(Boolean)
      .filter((name) => name.length > 1)
      .filter((name) => !/^All Majors$/i.test(name));
    return [...new Set(names)];
  });
}

async function clickMajor(page, majorName) {
  await page.evaluate((name) => {
    const rows = [...document.querySelectorAll('.viewByRow')];
    const row = rows.find((candidate) => {
      const text = (candidate.querySelector('.viewByRowColText')?.textContent || candidate.textContent || '').replace(/\s+/g, ' ').trim();
      return text === name;
    });
    const link = row?.querySelector('a');
    if (!link) throw new Error(`Major option not found: ${name}`);
    link.scrollIntoView({ block: 'center' });
    link.click();
  }, majorName);

  await page.waitForFunction(
    (name) => {
      const active = document.querySelector('.viewByRow.rowActive');
      const activeText = (active?.textContent || '').replace(/\s+/g, ' ').trim();
      const title = document.title || '';
      const hasResults = document.querySelectorAll('.resultsBox .articRow, .resultsBox .noArtic').length > 0;
      return activeText === name && (title.includes(name) || hasResults || document.querySelector('.resultsBox'));
    },
    majorName,
    { timeout: 20000 }
  ).catch(() => {});

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

async function extractMajorRows(page, majorName, academicYear) {
  return page.evaluate(
    ({ majorName, academicYear, sourceCollege, targetUniversity }) => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const courseCodes = (container) => {
        if (!container) return [];
        const codes = [...container.querySelectorAll('.prefixCourseNumber')]
          .map((node) => clean(node.textContent))
          .filter(Boolean);
        return [...new Set(codes)];
      };
      const courseExpression = (container) => {
        const codes = courseCodes(container);
        if (codes.length === 0) return '';

        const text = clean(container?.textContent);
        let cursor = 0;
        return codes.reduce((parts, code, index) => {
          const foundAt = text.indexOf(code, cursor);
          if (index > 0) {
            const between = foundAt === -1 ? '' : text.slice(cursor, foundAt);
            parts.push(/\bOr\b/i.test(between) ? 'OR' : 'AND');
          }
          parts.push(code);
          cursor = foundAt === -1 ? cursor : foundAt + code.length;
          return parts;
        }, []).join(' ');
      };
      const courseTitleByCode = (container, code) => {
        if (!container) return '';
        const lines = [...container.querySelectorAll('.courseLine')];
        for (const line of lines) {
          const lineCode = clean(line.querySelector('.prefixCourseNumber')?.textContent);
          if (lineCode !== code) continue;
          const title = clean(line.querySelector('.courseTitle')?.textContent);
          return title;
        }
        return '';
      };
      const rows = [];

      for (const articRow of document.querySelectorAll('.resultsBox .articRow')) {
        const receiving = articRow.querySelector('.rowReceiving');
        const sending = articRow.querySelector('.rowSending');
        const receivingCodes = courseCodes(receiving);
        const sendingCodes = courseCodes(sending);
        const receivingText = clean(receiving?.textContent);
        const sendingText = clean(sending?.textContent);

        // ASSIST's "receiving" side is UC Berkeley and "sending" side is CCSF
        // for this UI flow. Keep these columns directionally explicit.
        const required = receivingCodes.length > 0 ? courseExpression(receiving) : receivingText;
        const articulated = sendingCodes.length > 0 ? courseExpression(sending) : sendingText;

        if (!required && !articulated) continue;

        const titleNotes = receivingCodes
          .map((code) => {
            const title = courseTitleByCode(receiving, code);
            return title ? `${code}: ${title}` : code;
          })
          .join(' | ');

        rows.push({
          source_college: sourceCollege,
          target_university: targetUniversity,
          major: majorName,
          academic_year: academicYear,
          required_uc_course_or_area: required || 'Requirement',
          articulated_ccsf_course: articulated || 'No Course Articulated',
          notes: titleNotes || sendingText || receivingText,
          raw_agreement_url_or_id: location.href,
        });
      }

      if (rows.length === 0) {
        const resultText = clean(document.querySelector('.resultsBox')?.textContent);
        rows.push({
          source_college: sourceCollege,
          target_university: targetUniversity,
          major: majorName,
          academic_year: academicYear,
          required_uc_course_or_area: 'Agreement available',
          articulated_ccsf_course: 'No Course Articulated',
          notes: resultText.slice(0, 500),
          raw_agreement_url_or_id: location.href,
        });
      }

      return rows;
    },
    { majorName, academicYear, sourceCollege: SOURCE_COLLEGE, targetUniversity: TARGET_UNIVERSITY }
  );
}

(async () => {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: !DEBUG });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    console.log('Navigating to ASSIST...');
    await page.goto('https://www.assist.org', { waitUntil: 'networkidle' });
    await maybeDebug(page, '00_initial');

    console.log('Selecting institutions through the UI...');
    await selectInstitution(
      page,
      0,
      (text) => text.includes('City College of San Francisco') || text.includes('CCSF'),
      'source institution'
    );

    await page.waitForTimeout(1000);

    await selectInstitution(
      page,
      1,
      (text) => text.includes('University of California, Berkeley') || text.includes('UC Berkeley'),
      'target institution'
    );

    console.log('Leaving Academic Year unchanged.');
    await page.waitForTimeout(1000);

    const viewAgreementsBtn = page.getByRole('button', { name: /View Agreements/i }).first();
    await viewAgreementsBtn.waitFor({ state: 'visible', timeout: 15000 });
    console.log(`View Agreements button disabled: ${await viewAgreementsBtn.isDisabled()}`);
    await viewAgreementsBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForSelector('.viewByRow a', { timeout: 20000 });
    await maybeDebug(page, '01_agreement_list');

    const academicYear = await getSelectedAcademicYear(page);
    const majors = await getMajorNames(page);
    console.log(`Found ${majors.length} UC Berkeley agreement options.`);

    const rows = [];
    for (let index = 0; index < majors.length; index += 1) {
      const major = majors[index];
      console.log(`[${index + 1}/${majors.length}] Scraping ${major}`);
      await clickMajor(page, major);
      rows.push(...(await extractMajorRows(page, major, academicYear)));
    }

    const header = [
      'source_college',
      'target_university',
      'major',
      'academic_year',
      'required_uc_course_or_area',
      'articulated_ccsf_course',
      'notes',
      'raw_agreement_url_or_id',
    ];

    const csv = [
      header.map(csvCell).join(','),
      ...rows.map((row) => header.map((key) => csvCell(row[key])).join(',')),
    ].join('\n');

    fs.writeFileSync(outPath, `${csv}\n`);

    const uniqueMajors = new Set(rows.map((row) => row.major));
    console.log(`CSV written to ${outPath} with ${rows.length} rows across ${uniqueMajors.size} agreements.`);

    if (DEBUG) {
      fs.writeFileSync(
        path.join(rawDir, 'summary.json'),
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            academicYear,
            agreements: [...uniqueMajors],
            rowCount: rows.length,
          },
          null,
          2
        )
      );
    }
  } finally {
    await browser.close();
  }
})();
