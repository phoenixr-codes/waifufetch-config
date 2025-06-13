import { $ } from "bun";
import path from "path";
import fs from "fs/promises";
import { fallbackConfig } from "waifufetch";
import type { ColorInput } from "bun";
import type { Config } from "waifufetch";
import { homedir } from "os";
import minimist from "minimist";


const args = minimist(global.args);

/** Convenience function for easier applying colors on text. */
function style(color: ColorInput, text: string): string {
  return Bun.color(color, "ansi") + text;
}

/** Returns whether two dates represent the same day. */
function sameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate();
}

/** The response structure returned from the quotes API. */
type Response = {
  /** quote text */
  q: string;

  /** author name */
  a: string;

  /** author image */
  i: string;

  /** character count */
  c: string;

  /** pre-formatted HTML quote */
  h: string;
}[]

/** Returns a daily random quote. */
async function fetchQuote(): Promise<string | undefined> {
  const cacheFilePath = path.join(homedir(), ".cache/motd.txt");
  const cacheFile = Bun.file(cacheFilePath);
  const oldQuoteExists = await cacheFile.exists();
  const oldQuote = async () => oldQuoteExists ? await cacheFile.text() : undefined;
  if (oldQuoteExists) {
    const stats = await fs.stat(cacheFilePath);
    const modificationTime = stats.mtime;
    const today = new Date();
    const useCachedQuote = (sameDay(modificationTime, today));
    if (useCachedQuote) {
      return await cacheFile.text();
    }
  }
  let data: Response
  try {
    const response = await fetch("https://zenquotes.io/api/random/");
    if (!response.ok) return oldQuote();
    data = await response.json() as Response;
  } catch {
    return oldQuote();
  }
  const quote = data[0]!.q;
  const author = data[0]!.a;
  const text = `${quote}\n~ ${author}`;
  await cacheFile.write(text);
  return text;
}

/** catppuccin mocha palette. */
const palette = {
  rosewater: "#f5e0dc",
  flamingo: "#f2cdcd",
  pink: "#f5c2e7",
  mauve: "#cba6f7",
  red: "#f38ba8",
  maroon: "#eba0ac",
  peach: "#fab387",
  yellow: "#f9e2af",
  green: "#a6e3a1",
  teal: "#94e2d5",
  sky: "#89dceb",
  sapphire: "#74c7ec",
  blue: "#89b4fa",
  lavender: "#b4befe",
  text: "#cdd6f4",
};

/** The path to the ANSI art logo. */
const logoPath: string = args.logo ?? path.join(import.meta.path, "../art/endeavouros.ansi");

const shell: string | undefined = process.env.SHELL?.split("/")?.at(-1);
const term: string | undefined = process.env.TERM;
const editor: string | undefined = process.env.EDITOR;
const browser: string | undefined = process.env.BROWSER;
const desktop: string | undefined = process.env.DESKTOP_SESSION;

const quote: string | undefined = await fetchQuote();

const config: Config = {
  // Extend the default configuration.
  ...fallbackConfig,

  // Display the logo.
  logo: await Bun.file(logoPath).text(),

  // Content of the dashboard.
  dashboard: [
    // Display the username.
    { icon: style(palette.red, "\uf415"), text: style(palette.text, (await $`whoami`.text()).trim()) },

    // Insert a blank line.
    { divider: " " },

    // Display header for "System" section.
    { icon: style(palette.peach, "\uDB80\uDDC5"), text: "System" },

    // Display the operating system.
    { icon: style(palette.peach, "\uebc6"), text: style(palette.text, (await $`uname -o`.text()).trim()) },

    // Display the machine hardware name.
    { icon: style(palette.peach, "\uf4bc"), text: style(palette.text, (await $`uname -m`.text()).trim()) },

    // Display the uptime.
    { icon: style(palette.peach, "\udb81\udd35"), text: style(palette.text, (await $`uptime -p`.text()).trim()) },

    // Insert a blank line.
    { divider: " " },

    // Display header for "Environment" section.
    { icon: style(palette.yellow, "\udb80\udedc"), text: "Environment" },

    // Display the name of the shell if known.
    ...(shell === undefined ? [] : [{ icon: style(palette.yellow, "\uebca"), text: style(palette.text, shell) }]),

    // Display the name of the terminal if known.
    ...(term === undefined ? [] : [{ icon: style(palette.yellow, "\uea85"), text: style(palette.text, term) }]),

    // Display the name of the default editor if known.
    ...(editor === undefined ? [] : [{ icon: style(palette.yellow, "\uf044"), text: style(palette.text, editor) }]),

    // Display the default browser if known.
    ...(browser === undefined ? [] : [{ icon: style(palette.yellow, "\udb80\ude39"), text: style(palette.text, browser) }]),

    // Display the desktop environment.
    ...(desktop === undefined ? [] : [{ icon: style(palette.yellow, "\udb80\udf79"), text: style(palette.text, desktop) }]),

    // Insert a blank line.
    { divider: " " },

    // Display the quote if known.
    ...(quote === undefined ? [] : [{ text: style(palette.text, quote) }]),
  ],
};
export default config;
