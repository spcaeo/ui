/**
 * Behavioural tests for data-grid, run against demo.html by tools/smoke-test.mjs.
 *
 * The URL assertions are the important ones. A grid that looks right but cannot
 * be linked to has failed at the only thing that distinguishes it.
 */
const q = (page) => new URL(page.url()).searchParams;

export default async function run({ page, check }) {
  const grid = "#demo-default";

  console.log("\nthe URL starts clean");
  {
    // Every value is at its default, so nothing should be written down. A URL
    // full of page=1&size=25&view=table commits you to parameters that carry
    // no information and must be supported forever.
    check("a default view writes no parameters", q(page).toString() === "", q(page).toString());
  }

  console.log("\nsearch");
  {
    await page.fill(`${grid} .dg-search input`, "brontë");
    await page.waitForTimeout(700);
    check("search reaches the URL", q(page).get("bk_q") === "brontë", q(page).get("bk_q"));
    const authors = await page.locator(`${grid} tbody tr td:nth-child(3)`).allInnerTexts();
    check(
      "only matching rows remain",
      authors.length > 0 && authors.every((a) => a.includes("Brontë")),
      authors.join("|"),
    );

    await page.click(`${grid} .dg-search-clear`);
    await page.waitForTimeout(500);
    check("clearing removes the parameter entirely", q(page).get("bk_q") === null);
  }

  console.log("\nsorting");
  {
    await page.click(`${grid} thead th:nth-child(2) .dg-sort`);
    await page.waitForTimeout(400);
    check("sort reaches the URL", q(page).get("bk_sort") === "title:asc", q(page).get("bk_sort"));
    check(
      "the header announces direction",
      (await page.getAttribute(`${grid} thead th:nth-child(2)`, "aria-sort")) === "ascending",
    );

    const first = await page.locator(`${grid} tbody tr td:nth-child(2)`).first().innerText();
    await page.click(`${grid} thead th:nth-child(2) .dg-sort`);
    await page.waitForTimeout(400);
    check(
      "clicking again reverses it",
      q(page).get("bk_sort") === "title:desc",
      q(page).get("bk_sort"),
    );
    const firstDesc = await page.locator(`${grid} tbody tr td:nth-child(2)`).first().innerText();
    check("the rows actually reordered", first !== firstDesc, `${first} vs ${firstDesc}`);
  }

  console.log("\npaging, and what resets what");
  {
    await page.click(`${grid} .dg-page-buttons .dg-btn:nth-child(2)`); // Next
    await page.waitForTimeout(400);
    check("page reaches the URL", q(page).get("bk_page") === "2", q(page).get("bk_page"));

    // Changing the result set while on page 2 must return to page 1, or the
    // grid shows an empty page and the emptiness looks like "no matches".
    await page.fill(`${grid} .dg-search input`, "wells");
    await page.waitForTimeout(700);
    check("searching resets the page", q(page).get("bk_page") === null, q(page).get("bk_page"));
    await page.click(`${grid} .dg-search-clear`);
    await page.waitForTimeout(500);
  }

  console.log("\nfilters");
  {
    await page.click(`${grid} .dg-toolbar button[popovertarget]`); // Genre
    await page.waitForTimeout(300);
    await page.locator(".dg-pop:popover-open .dg-opt input").first().check();
    await page.click(".dg-pop:popover-open .dg-btn-primary");
    await page.waitForTimeout(500);

    check(
      "the filter is encoded into the URL",
      (q(page).get("bk_fx") ?? "").startsWith("1."),
      q(page).get("bk_fx"),
    );
    check(
      "a chip describes the active filter",
      (await page.locator(`${grid} .dg-chip`).count()) > 0,
    );

    const chip = await page.locator(`${grid} .dg-chip`).first().innerText();
    check("the chip is readable, not raw data", /is any of/.test(chip), chip);

    await page.click(`${grid} .dg-chip button`);
    await page.waitForTimeout(400);
    check("removing the chip clears the parameter", q(page).get("bk_fx") === null);
  }

  console.log("\ndeep links restore the exact view");
  {
    const deep = new URL(page.url());
    // A broad term on purpose: a narrow one leaves page 2 empty, and then there
    // is no table to inspect — which is correct behaviour and a useless test.
    deep.search = "bk_q=the&bk_sort=price:desc&bk_page=2&bk_size=10";
    await page.goto(deep.href, { waitUntil: "load" });
    await page.waitForTimeout(900);
    check("search restored", (await page.inputValue(`${grid} .dg-search input`)) === "the");
    check(
      "sort restored",
      (await page.getAttribute(`${grid} thead th:nth-child(7)`, "aria-sort")) === "descending",
    );
    check("page size restored", (await page.inputValue(`${grid} .dg-pagination select`)) === "10");
    check(
      "page restored",
      /Page 2 of/.test(await page.locator(`${grid} .dg-pagination`).innerText()),
    );
  }

  console.log("\nrubbish in the URL degrades, never crashes");
  {
    const bad = new URL(page.url());
    bad.search = "bk_page=-9&bk_size=99999&bk_sort=DROP%20TABLE:asc&bk_fx=notreal&bk_seg=ghost";
    await page.goto(bad.href, { waitUntil: "load" });
    await page.waitForTimeout(900);
    check("the grid still rendered rows", (await page.locator(`${grid} tbody tr`).count()) > 0);
    check(
      "an unknown sort field was dropped",
      (await page.locator(`${grid} thead th[aria-sort="ascending"]`).count()) === 0,
    );
    check(
      "the page clamped into range",
      /Page 1 of/.test(await page.locator(`${grid} .dg-pagination`).innerText()),
    );
  }

  console.log("\none grid never clobbers another");
  {
    const two = new URL(page.url());
    two.search = "bk_q=wells&sh_q=austen&utm_source=newsletter";
    await page.goto(two.href, { waitUntil: "load" });
    await page.waitForTimeout(900);
    await page.fill(`${grid} .dg-search input`, "kafka");
    await page.waitForTimeout(700);
    check("the other grid's state survived", q(page).get("sh_q") === "austen", q(page).get("sh_q"));
    check("unrelated parameters survived", q(page).get("utm_source") === "newsletter");
  }

  console.log("\nthe states are distinguishable");
  {
    await page.goto(page.url().split("?")[0], { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const title = async (sel) =>
      await page
        .locator(`${sel} .dg-state-title`)
        .innerText()
        .catch(() => "");
    const err = await title("#demo-states");
    const empty = await title("#demo-empty");
    check("a failed request does not say 'no results'", err && !/no results/i.test(err), err);
    check(
      "a failed request says the count is unknown",
      /not a count of zero/i.test(await page.locator("#demo-states .dg-state-body").innerText()),
    );
    check(
      "an error carries a code and a request id",
      /GRID_QUERY_FAILED · req_/.test(
        await page.locator("#demo-states .dg-state-meta").innerText(),
      ),
    );
    check("empty and error read differently", empty !== err, `${empty} vs ${err}`);
    check(
      "the error offers Copy error details",
      (await page.locator("#demo-states .dg-state-actions .dg-btn").allInnerTexts()).some((t) =>
        /copy/i.test(t),
      ),
    );
  }

  console.log("\nselection states its scope");
  {
    await page.locator("#demo-default tbody input[type=checkbox]").first().check();
    await page.waitForTimeout(250);
    const bar = await page.locator("#demo-default .dg-selection").innerText();
    // "3 selected" that silently means "on this page" is how a bulk action
    // surprises somebody. Say which.
    check("the selection bar names its scope", /on this page/.test(bar), bar);
  }

  console.log("\nempty containers do not render");
  {
    // Regression: a class setting `display` outranks the [hidden] attribute, so
    // hidden bars rendered as empty bordered strips. A screenshot caught it.
    const ghosts = await page.evaluate(
      () =>
        [...document.querySelectorAll(".dg [hidden]")].filter(
          (el) => el.getBoundingClientRect().height > 0,
        ).length,
    );
    check("nothing hidden is still taking up space", ghosts === 0, `${ghosts} visible`);
  }
}
