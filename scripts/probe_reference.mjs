import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ANALYSIS_DIR = path.join(ROOT_DIR, 'reference_analysis');
const FRAMES_DIR = path.join(ANALYSIS_DIR, 'frames');
const VIDEOS_DIR = path.join(ROOT_DIR, 'reference_videos');

const TARGET_URL = 'https://www.facebook.com/iBlue.Night22/reels/';

async function runProbe() {
  console.log(`[Probe] Launching Chromium to analyze ${TARGET_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 1600 },
    locale: 'en-US'
  });

  const page = await context.newPage();

  // Intercept video/audio responses
  const mediaUrls = [];
  page.on('response', async res => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('video') || ct.includes('audio') || url.includes('.mp4') || url.includes('.m4a') || url.includes('bytestart')) {
      mediaUrls.push({
        url,
        contentType: ct,
        status: res.status()
      });
    }
  });

  console.log(`[Probe] Navigating to reels tab...`);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => {
    console.log('[Probe] Navigation warning:', e.message);
  });
  await page.waitForTimeout(4000);

  // Clear cookie banners / login overlays
  try {
    await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach(d => d.remove());
      const backdrops = document.querySelectorAll('div[style*="rgba(0, 0, 0"]');
      backdrops.forEach(b => b.remove());
    });
    const closeButtons = await page.$$('[aria-label="Close"], [aria-label="Fermer"], [aria-label="Decline optional cookies"], [data-testid="cookie-policy-manage-dialog-accept-button"]');
    for (const btn of closeButtons) {
      await btn.click().catch(() => {});
    }
  } catch (e) {
    console.log('[Probe] Overlay dismiss error:', e.message);
  }

  await page.waitForTimeout(2000);

  // Scroll down a bit to load reels
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(2500);

  // Screenshot gallery
  const galleryScreenshot = path.join(ANALYSIS_DIR, 'page_reels_overview.png');
  await page.screenshot({ path: galleryScreenshot, fullPage: false });
  console.log(`[Probe] Saved reels overview screenshot to: ${galleryScreenshot}`);

  // Extract page metadata and reels links
  const pageData = await page.evaluate(() => {
    const title = document.title;
    const allLinks = Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: (a.innerText || '').trim(), aria: a.getAttribute('aria-label') || '' }));

    const reelLinks = allLinks.filter(l => l.href.includes('/reel/') || l.href.includes('/watch/'));

    // Extract text blocks / descriptions
    const textNodes = Array.from(document.querySelectorAll('span, div[dir="auto"], h1, h2'))
      .map(el => (el.innerText || '').trim())
      .filter(t => t.length > 5 && !t.includes('Facebook') && !t.includes('Log In') && !t.includes('Sign Up'));

    return {
      title,
      reelLinks: [...new Set(reelLinks.map(l => l.href))],
      sampleTexts: [...new Set(textNodes)].slice(0, 30)
    };
  });

  console.log(`[Probe] Page Title:`, pageData.title);
  console.log(`[Probe] Discovered Reel Links (${pageData.reelLinks.length}):`, pageData.reelLinks.slice(0, 5));
  console.log(`[Probe] Sample Texts:`, pageData.sampleTexts.slice(0, 10));

  fs.writeFileSync(path.join(ANALYSIS_DIR, 'page_data.json'), JSON.stringify(pageData, null, 2), 'utf-8');

  // If no reel links found, try looking for general video links or inspecting the page directly
  let reelsToInspect = pageData.reelLinks;
  if (reelsToInspect.length === 0) {
    console.log('[Probe] No direct /reel/ links found in DOM anchors, checking hrefs containing video or numbers...');
    const altLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/videos/"], a[href*="iBlue.Night22"]'))
        .map(a => a.href);
    });
    reelsToInspect = [...new Set(altLinks)];
    console.log('[Probe] Alternative links:', reelsToInspect);
  }

  // Inspect the top reel
  const capturedReels = [];
  for (let i = 0; i < Math.min(3, reelsToInspect.length); i++) {
    const reelUrl = reelsToInspect[i];
    console.log(`\n[Probe] Inspecting Reel ${i + 1}: ${reelUrl}...`);
    const reelPage = await context.newPage();
    const reelMedia = [];
    reelPage.on('response', res => {
      const u = res.url();
      const ct = res.headers()['content-type'] || '';
      if ((ct.includes('video') || u.includes('.mp4')) && !u.includes('blob:')) {
        reelMedia.push(u);
      }
    });

    try {
      await reelPage.goto(reelUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await reelPage.waitForTimeout(3500);

      // Clean overlays
      await reelPage.evaluate(() => {
        document.querySelectorAll('[role="dialog"]').forEach(d => d.remove());
        document.querySelectorAll('div[style*="rgba(0, 0, 0"]').forEach(b => b.remove());
      });

      // Capture screenshot of the reel playing
      const reelShot = path.join(FRAMES_DIR, `reel_${i + 1}_frame1.png`);
      await reelPage.screenshot({ path: reelShot });
      console.log(`[Probe] Captured frame: ${reelShot}`);

      // Wait 3 seconds and take another shot to observe motion/typography
      await reelPage.waitForTimeout(3000);
      const reelShot2 = path.join(FRAMES_DIR, `reel_${i + 1}_frame2.png`);
      await reelPage.screenshot({ path: reelShot2 });
      console.log(`[Probe] Captured frame: ${reelShot2}`);

      // Extract reel caption/sound/details
      const details = await reelPage.evaluate(() => {
        const textBlocks = Array.from(document.querySelectorAll('span, div[dir="auto"], h1, h2, div[data-ad-preview="message"]'))
          .map(el => (el.innerText || '').trim())
          .filter(t => t.length > 5 && !t.includes('Facebook') && !t.includes('Log In'));
        const videoSrc = document.querySelector('video')?.src || '';
        return {
          title: document.title,
          textBlocks: [...new Set(textBlocks)].slice(0, 20),
          videoSrc
        };
      });

      capturedReels.push({
        url: reelUrl,
        details,
        mediaUrls: reelMedia.slice(0, 5)
      });
    } catch (err) {
      console.log(`[Probe] Error inspecting reel ${reelUrl}:`, err.message);
    } finally {
      await reelPage.close();
    }
  }

  fs.writeFileSync(path.join(ANALYSIS_DIR, 'reels_inspection.json'), JSON.stringify(capturedReels, null, 2), 'utf-8');
  console.log(`[Probe] Saved reels_inspection.json`);

  await browser.close();
  console.log(`[Probe] Inspection finished.`);
}

runProbe().catch(e => {
  console.error('[Probe] Fatal error:', e);
  process.exit(1);
});
