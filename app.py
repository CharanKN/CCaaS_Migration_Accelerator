from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from pydantic import ValidationError
import streamlit as st

from connect_agent.agent import interpret_requirements
from connect_agent.input_parser import (
    NotTemplateWorkbookError,
    workbook_to_prompt,
    workbook_to_spec,
)
from connect_agent.github_ui import github_publish_panel
from connect_agent.manual_ui import existing_dnis_flow_builder, manual_builder
from connect_agent.models import AgentResponse
from connect_agent.terraform import files_to_zip, render_files


load_dotenv()
st.set_page_config(
    page_title="AWS Connect Migration Accelerator Tool",
    page_icon="☁️",
    layout="wide",
    initial_sidebar_state="collapsed",
)


def resolve_theme() -> str:
    """Return the resolved active theme ('light' or 'dark')."""
    try:
        theme = st.context.theme
        if theme is not None and getattr(theme, "type", None) in ("light", "dark"):
            return theme.type
    except Exception:
        pass
    try:
        base = st.get_option("theme.base")
        if base in ("light", "dark"):
            return base
    except Exception:
        pass
    return "dark"


_COMMON_TOKENS = {
    "gold": "#f6c453",
    "gold-bright": "#ffe59a",
    "gold-muted": "#d9bd79",
    "navbar-bg": "linear-gradient(90deg, #030c28, #071a3d 55%, #030c28)",
    "navbar-fg": "#ffe59a",
    "navbar-fg-muted": "#c9b478",
    "navbar-border": "rgba(246, 196, 83, .34)",
    "navbar-h": "3.9rem",
    "footer-h": "3.3rem",
}

_THEME_TOKENS = {
    "dark": {
        "page-bg": (
            "radial-gradient(circle at 12% 4%, rgba(36,139,255,.18), transparent 28rem),"
            "linear-gradient(145deg, #020617, #03112d 52%, #020617)"
        ),
        "text": "#ffe59a",
        "text-muted": "#d9bd79",
        "heading": "#ffe59a",
        "panel-bg": "rgba(7, 26, 61, .9)",
        "panel-border": "rgba(246, 196, 83, .34)",
        "hero-bg": (
            "radial-gradient(circle at 90% 0%, rgba(36,139,255,.18), transparent 20rem),"
            "linear-gradient(135deg, rgba(7,26,61,.95), rgba(3,12,40,.95))"
        ),
        "card-bg": "rgba(7, 26, 61, .72)",
        "pill-bg": "rgba(246, 196, 83, .1)",
        "pill-fg": "#ffe59a",
        # Gold works as accent text on dark backgrounds
        "accent-text": "#f6c453",
        "input-bg": "rgba(7, 26, 61, .9)",
        "input-border": "rgba(246, 196, 83, .34)",
        "shadow-color": "rgba(0,0,0,.45)",
        "form-bg": "rgba(4, 16, 42, .6)",
    },
    "light": {
        "page-bg": (
            "radial-gradient(circle at 12% 0%, rgba(36,139,255,.10), transparent 26rem),"
            "linear-gradient(145deg, #eef3fb, #f7fafe 60%, #eef3fb)"
        ),
        "text": "#16263f",
        "text-muted": "#51617d",
        "heading": "#071a3d",
        "panel-bg": "#ffffff",
        "panel-border": "#d6e0f0",
        "hero-bg": (
            "radial-gradient(circle at 90% 0%, rgba(36,139,255,.12), transparent 20rem),"
            "linear-gradient(135deg, #ffffff, #eef3fb)"
        ),
        "card-bg": "#ffffff",
        "pill-bg": "#eaf0fb",
        "pill-fg": "#0b2554",
        # Darker amber keeps the gold feel but has sufficient contrast on white (~5:1)
        "accent-text": "#8b6200",
        "input-bg": "#f7faff",
        "input-border": "#c8d8ef",
        "shadow-color": "rgba(7,26,61,.12)",
        "form-bg": "#f4f8ff",
    },
}

@st.fragment(run_every="1s")
def _sync_theme_tokens() -> None:
    """Re-emit the theme CSS variables on a timer.

    Streamlit applies a user's Light/Dark menu choice to its own native
    widgets instantly (via its internal theme context), but it does not
    trigger a script rerun, so ``resolve_theme()`` — and this fragment
    with it — would otherwise only pick up the change on the next
    widget interaction or full page reload. Re-running this small
    fragment every second keeps our custom `:root` variables (and every
    rule built on them) in sync without rerunning the rest of the app.
    """
    theme = resolve_theme()
    tokens = {**_COMMON_TOKENS, **_THEME_TOKENS[theme]}
    root_vars = " ".join(f"--{name}: {value};" for name, value in tokens.items())
    st.markdown(f"<style>:root {{ {root_vars} }}</style>", unsafe_allow_html=True)


_sync_theme_tokens()

st.markdown(
    """
<style>
/* ---- Base --------------------------------------------------------------- */
.stApp {
  color: var(--text);
  background: var(--page-bg) fixed;
}

/* Streamlit's toolbar is a full-width bar that otherwise overlays our fixed
   navbar and swallows every click on the nav. Make the bar itself
   click-through, and re-enable pointer events only on its top-right action
   cluster so the settings / theme menu stays reachable. */
[data-testid="stHeader"] {background: transparent !important; pointer-events: none !important;}
[data-testid="stToolbar"] {pointer-events: none !important; z-index: 1000 !important;}
/* This cluster is painted inside our fixed navbar's footprint, which is
   always dark regardless of the active theme (see --navbar-fg). Left to
   inherit `color` it picks up `--text`, which is near-black in light mode —
   effectively invisible against the dark navbar. Force the navbar's own
   foreground color instead so the icon stays legible in both themes. */
[data-testid="stToolbarActions"],
[data-testid="stMainMenu"],
[data-testid="stMainMenuButton"],
[data-testid="stStatusWidget"] {
  pointer-events: auto !important;
  color: var(--navbar-fg) !important;
}

[data-testid="stSidebar"],
[data-testid="stSidebarCollapsedControl"],
[data-testid="collapsedControl"] {display: none !important;}

.block-container {
  max-width: 1200px;
  padding-top: calc(var(--navbar-h) + 1.5rem);
  padding-bottom: calc(var(--footer-h) + 2rem);
}

h1, h2, h3, h4, h5, p, li, label, .stMarkdown,
[data-testid="stWidgetLabel"], [data-testid="stMetricValue"] {
  color: var(--text) !important;
}

/* ---- Panels & widgets --------------------------------------------------- */
[data-testid="stFileUploaderDropzone"],
[data-testid="stExpander"],
div[data-testid="stCodeBlock"] {
  background: var(--panel-bg) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 16px !important;
}

[data-testid="stMetric"] {
  background: var(--panel-bg) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 16px !important;
  padding: 1.1rem 1.1rem .9rem !important;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
[data-testid="stMetric"]:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(246,196,83,.2) !important;
  border-color: rgba(246,196,83,.55) !important;
}
[data-testid="stMetricValue"] {
  font-size: 2rem !important;
  font-weight: 800 !important;
  color: var(--accent-text) !important;
}
[data-testid="stMetricLabel"] {
  color: var(--text-muted) !important;
  font-size: .78rem !important;
  text-transform: uppercase !important;
  letter-spacing: .8px !important;
}

[data-testid="stFileUploaderDropzone"] small,
[data-testid="stFileUploaderDropzoneInstructions"] div,
.stCaption, .stCaption p {color: var(--text-muted) !important;}

/* ---- Buttons ------------------------------------------------------------ */
.stButton > button, .stDownloadButton > button {
  color: #031a45 !important;
  font-weight: 800 !important;
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%) !important;
  border: none !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 18px rgba(246,196,83,.32);
  transition: transform .18s ease, box-shadow .18s ease;
  letter-spacing: .2px;
}
.stButton > button:hover, .stDownloadButton > button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(246,196,83,.5);
}
.stDownloadButton > button p, .stDownloadButton > button span,
.stDownloadButton > button div {color: #031a45 !important; font-weight: 900 !important;}
.stButton > button:disabled {
  color: #031a45 !important;
  background: linear-gradient(135deg, var(--gold), var(--gold-bright)) !important;
  border: none !important;
  opacity: .52;
  box-shadow: none;
}
.stButton > button:disabled p, .stButton > button:disabled span,
.stButton > button:disabled div {color: #031a45 !important; font-weight: 900 !important;}

hr {border-color: var(--panel-border);}

/* ---- Inputs ------------------------------------------------------------- */
.stTextInput input, .stNumberInput input, .stTextArea textarea,
[data-baseweb="input"], [data-baseweb="base-input"] {
  background: var(--input-bg) !important;
  color: var(--text) !important;
  border-radius: 10px !important;
  border-color: var(--input-border) !important;
  transition: border-color .15s, box-shadow .15s;
}
.stTextInput input:focus, .stNumberInput input:focus, .stTextArea textarea:focus {
  border-color: rgba(246,196,83,.55) !important;
  box-shadow: 0 0 0 3px rgba(246,196,83,.12) !important;
}
[data-baseweb="select"] > div {
  background: var(--input-bg) !important;
  color: var(--text) !important;
  border-color: var(--input-border) !important;
  border-radius: 10px !important;
}
[data-baseweb="select"] svg {color: var(--text-muted) !important;}
[data-baseweb="popover"] [role="listbox"],
[data-baseweb="menu"] {
  background: var(--panel-bg) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px var(--shadow-color) !important;
}
[data-baseweb="menu"] li,
[data-baseweb="menu"] [role="option"] {
  background: transparent !important;
  color: var(--text) !important;
}
[data-baseweb="menu"] li:hover,
[data-baseweb="menu"] [role="option"]:hover {
  background: var(--pill-bg) !important;
}
[data-baseweb="menu"] [aria-selected="true"],
[data-baseweb="menu"] [data-highlighted="true"] {
  background: var(--pill-bg) !important;
  color: var(--heading) !important;
}
input::placeholder, textarea::placeholder {color: var(--text-muted) !important; opacity: .8;}

/* ---- Fixed header ------------------------------------------------------- */
.st-key-app-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999;
  min-height: var(--navbar-h);
  /* extra right padding clears Streamlit's top-right menu button */
  padding: .15rem 3.4rem .15rem 1.8rem;
  background: var(--navbar-bg);
  border-bottom: 1px solid var(--navbar-border);
  box-shadow: 0 4px 28px rgba(0,0,0,.45);
  /* Make all wrapper divs click-through so they never intercept widget events */
  pointer-events: none;
}
/* Re-enable pointer events only on interactive elements */
.st-key-app-header button,
.st-key-app-header a,
.st-key-app-header input,
.st-key-app-header select {
  pointer-events: auto !important;
}
.st-key-app-header [data-testid="stHorizontalBlock"] {align-items: center;}

.navbar-brand {display: flex; align-items: center; gap: .8rem;}
.navbar-brand .logo-box {
  width: 2.2rem; height: 2.2rem; flex-shrink: 0;
  background: linear-gradient(135deg, var(--gold), var(--gold-bright));
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; line-height: 1;
  box-shadow: 0 2px 14px rgba(246,196,83,.4);
}
.navbar-brand .titles h1 {
  margin: 0 !important;
  color: var(--navbar-fg) !important;
  font-size: 1.15rem; line-height: 1.2; font-weight: 700;
}
.navbar-brand .titles p {
  margin: 0 !important;
  color: var(--navbar-fg-muted) !important;
  font-size: .66rem; text-transform: uppercase; letter-spacing: 1.8px;
}

/* ---- Nav tabs — modern text links with animated underline --------------- */
/* This Streamlit build renders st.segmented_control as stButtonGroup with
   role="radio" buttons carrying data-variant="segmented_control"; the active
   item is flagged with aria-checked / data-selected. */
.st-key-app-header [data-testid="stButtonGroup"] {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
/* hide the collapsed "Navigate" widget label */
.st-key-app-header [data-testid="stButtonGroup"] > label,
.st-key-app-header [data-testid="stButtonGroup"] [data-testid="stWidgetLabel"] {
  display: none !important;
}
/* the radiogroup: strip the capsule so items read as bare text links */
.st-key-app-header [data-testid="stButtonGroup"] > div[role="radiogroup"] {
  display: flex !important;
  gap: .35rem !important;
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  box-shadow: none !important;
  flex-wrap: nowrap;
}
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"] {
  position: relative;
  background: transparent !important;
  border: none !important;
  /* The active/hover underline is a real bottom border on the button itself.
     A transitioned ::after pseudo-element does NOT repaint when Streamlit flips
     aria-checked on the reused button node between reruns, so the underline
     would stick to the previously-active tab. A border on the host element
     repaints reliably (like color), keeping the indicator in sync. */
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--navbar-fg-muted) !important;
  /* Streamlit paints the label via -webkit-text-fill-color, which overrides
     `color`; both must be set or the nav text keeps its default red/grey. */
  -webkit-text-fill-color: var(--navbar-fg-muted) !important;
  font-weight: 600 !important;
  font-size: .9rem !important;
  letter-spacing: .2px;
  padding: .5rem .3rem .35rem !important;
  margin: 0 .35rem !important;
  min-height: 0 !important;
  height: auto !important;
  white-space: nowrap;
  pointer-events: auto !important;
  transition: color .18s ease, -webkit-text-fill-color .18s ease,
              border-color .18s ease;
}
/* lay the emoji + label out inline and mute the icon a touch */
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"] > div,
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"] > div > span {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: .4rem !important;
}
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"] p {
  color: inherit !important;
  -webkit-text-fill-color: inherit !important;
  margin: 0 !important;
  pointer-events: none;
}
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"] [data-testid="stIconEmoji"] {
  font-size: .9rem !important;
  opacity: .85;
}
/* hover (on a non-active tab): brighten text and hint the underline */
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"]:hover,
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"]:hover p {
  color: var(--navbar-fg) !important;
  -webkit-text-fill-color: var(--navbar-fg) !important;
  background: transparent !important;
}
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"]:hover {
  border-bottom-color: rgba(246, 196, 83, .5) !important;
}
.st-key-app-header [data-testid="stButtonGroup"] button[data-variant="segmented_control"]:focus-visible {
  outline: none !important;
}
/* NOTE: the active-tab styling (gold text + gold underline) is intentionally
   NOT defined here with [aria-checked]/[data-selected] attribute selectors.
   Streamlit reuses the button DOM nodes between reruns and only flips those
   attributes; Chromium fails to invalidate the cached computed style on such
   attribute-only mutations, so the indicator sticks to the previously-active
   tab. Instead we emit a positional :nth-of-type rule from Python on every
   rerun (see `_nav_active_style`) — a changing stylesheet forces a clean style
   recalc and always tracks the real active page. */

/* ---- Page head with left accent bar ------------------------------------ */
.page-head {margin: .2rem 0 1.6rem; padding-left: 1rem; position: relative;}
.page-head::before {
  content: '';
  position: absolute; left: 0; top: .15rem; bottom: .15rem;
  width: 3px;
  background: linear-gradient(180deg, var(--gold), rgba(246,196,83,0));
  border-radius: 2px;
}
.page-head h2 {margin: 0 !important; color: var(--heading) !important; font-size: 1.65rem; font-weight: 800;}
.page-head p  {margin: .3rem 0 0 !important; color: var(--text-muted) !important; font-size: .95rem;}

/* ---- Hero --------------------------------------------------------------- */
.hero {
  padding: 2rem 2.2rem;
  border: 1px solid var(--panel-border);
  border-radius: 22px;
  background: var(--hero-bg);
  box-shadow: 0 16px 48px rgba(0,0,0,.2);
  position: relative; overflow: hidden;
}
.hero::after {
  content: '';
  position: absolute; top: -60px; right: -60px;
  width: 240px; height: 240px; border-radius: 50%;
  background: radial-gradient(circle, rgba(246,196,83,.14), transparent 70%);
  pointer-events: none;
}
.hero-badge {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .2rem .75rem; margin-bottom: .85rem;
  background: rgba(246,196,83,.1);
  border: 1px solid rgba(246,196,83,.28);
  border-radius: 999px;
  font-size: .7rem; font-weight: 700; letter-spacing: 1.3px;
  text-transform: uppercase; color: var(--accent-text) !important;
}
.hero h2 {
  margin: 0 0 .6rem !important; color: var(--heading) !important;
  font-size: 2rem; font-weight: 800; line-height: 1.22;
}
.hero p {
  color: var(--text-muted) !important; font-size: 1rem;
  margin: 0 0 1.4rem !important; max-width: 580px; line-height: 1.65;
}
.hero code, .app-footer code {color: var(--accent-text) !important;}
.hero-stats {
  display: flex; gap: 2.2rem; flex-wrap: wrap;
  padding-top: 1.1rem;
  border-top: 1px solid var(--panel-border);
}
.hero-stats .stat .num {
  font-size: 1.5rem; font-weight: 800;
  color: var(--accent-text) !important; line-height: 1;
}
.hero-stats .stat .lbl {
  font-size: .7rem; text-transform: uppercase;
  letter-spacing: 1px; color: var(--text-muted) !important; margin-top: .2rem;
}

/* ---- Feature cards ------------------------------------------------------ */
.feature-card {
  height: 100%;
  padding: 1.4rem 1.3rem;
  border: 1px solid var(--panel-border); border-radius: 18px;
  background: var(--card-bg);
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 14px 36px rgba(246,196,83,.18);
  border-color: rgba(246,196,83,.45);
}
.feature-card .ico-wrap {
  width: 2.8rem; height: 2.8rem;
  border-radius: 12px;
  background: var(--pill-bg);
  border: 1px solid var(--panel-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.35rem; margin-bottom: .9rem;
}
.feature-card h4 {margin: 0 0 .4rem !important; color: var(--heading) !important; font-size: 1rem; font-weight: 700;}
.feature-card p  {margin: 0 !important; color: var(--text-muted) !important; font-size: .86rem; line-height: 1.5;}

/* ---- How it works steps ------------------------------------------------- */
.step-card {padding: 1rem .9rem 1rem 0;}
.step-num {
  width: 2rem; height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--gold), var(--gold-bright));
  display: flex; align-items: center; justify-content: center;
  font-size: .8rem; font-weight: 800; color: #031a45;
  margin-bottom: .6rem;
  box-shadow: 0 2px 10px rgba(246,196,83,.4);
}
.step-title {font-size: .95rem; font-weight: 700; color: var(--heading) !important; margin-bottom: .25rem;}
.step-body  {font-size: .82rem; color: var(--text-muted) !important; line-height: 1.45;}

/* ---- Section / step label pill ----------------------------------------- */
.step-pill, .section-label {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .25rem .85rem; margin-bottom: .6rem;
  border: 1px solid var(--panel-border); border-radius: 999px;
  background: var(--pill-bg);
  color: var(--pill-fg) !important; font-weight: 700; font-size: .78rem;
  letter-spacing: .4px;
}

.muted {color: var(--text-muted) !important;}

/* ---- Forms & bordered containers --------------------------------------- */
[data-testid="stForm"] {
  background: var(--form-bg) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 18px !important;
  padding: 1.2rem 1.2rem .8rem !important;
}
/* st.container(border=True) */
[data-testid="stVerticalBlockBorderWrapper"] > div {
  background: var(--card-bg) !important;
  border-color: var(--panel-border) !important;
  border-radius: 14px !important;
}

/* ---- Expander ----------------------------------------------------------- */
[data-testid="stExpander"] details summary {
  background: var(--panel-bg) !important;
  border-radius: 14px !important;
}
[data-testid="stExpander"] details[open] summary {
  border-radius: 14px 14px 0 0 !important;
}
[data-testid="stExpander"] details summary span,
[data-testid="stExpander"] details summary p,
[data-testid="stExpander"] details > summary > span {
  color: var(--text) !important;
}
[data-testid="stExpander"] details > div {
  background: var(--panel-bg) !important;
  border-color: var(--panel-border) !important;
  border-radius: 0 0 14px 14px !important;
}

/* ---- Checkboxes & radios ----------------------------------------------- */
[data-testid="stCheckbox"] label span,
[data-testid="stCheckbox"] p,
[data-testid="stRadio"] label span,
[data-testid="stRadio"] p {
  color: var(--text) !important;
}
/* Checkbox/radio box border */
[data-testid="stCheckbox"] [data-baseweb="checkbox"] div,
[data-testid="stRadio"]    [data-baseweb="radio"]    div {
  border-color: var(--input-border) !important;
}

/* ---- Number input stepper buttons -------------------------------------- */
[data-testid="stNumberInput"] button {
  background: var(--input-bg) !important;
  border-color: var(--input-border) !important;
  color: var(--text) !important;
}

/* ---- JSON viewer -------------------------------------------------------- */
[data-testid="stJson"] {
  background: var(--form-bg) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 14px !important;
  color: var(--text) !important;
}
[data-testid="stJson"] * {
  color: var(--text) !important;
}

/* ---- Alert messages ---------------------------------------------------- */
[data-testid="stAlert"],
[data-testid="stAlertContainer"] {
  border-radius: 12px !important;
}
.stAlert p, .stAlert span {color: inherit !important;}

/* ---- Divider ------------------------------------------------------------ */
hr, [data-testid="stHorizontalDivider"] {
  border-color: var(--panel-border) !important;
}

/* ---- Tooltip ------------------------------------------------------------ */
[data-testid="stTooltipContent"] {
  background: var(--panel-bg) !important;
  color: var(--text) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 10px !important;
  box-shadow: 0 6px 20px var(--shadow-color) !important;
}

/* ---- File uploader file name & remove button --------------------------- */
[data-testid="stFileUploaderFileName"],
[data-testid="stFileUploaderFile"] p {
  color: var(--text) !important;
}
[data-testid="stFileUploaderDeleteBtn"] button {
  background: transparent !important;
  color: var(--text-muted) !important;
  border: none !important;
  box-shadow: none !important;
}
[data-testid="stFileUploaderDeleteBtn"] button:hover {
  color: var(--text) !important;
  transform: none !important;
  box-shadow: none !important;
}

/* ---- Spinner text ------------------------------------------------------- */
[data-testid="stSpinner"] p {color: var(--text) !important;}

/* ---- Success / info / warning / error text ----------------------------- */
[data-testid="stNotification"] p,
div[data-baseweb="notification"] p {
  color: inherit !important;
}

/* ---- Fixed footer ------------------------------------------------------- */
.app-footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 100;
  min-height: var(--footer-h);
  padding: .55rem 1.8rem;
  border-top: 1px solid var(--navbar-border);
  background: var(--navbar-bg);
  box-shadow: 0 -4px 28px rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
}
.app-footer .center {
  display: flex; flex-wrap: wrap; gap: 1.2rem;
  align-items: center; justify-content: center;
}
.app-footer .center span {color: var(--navbar-fg-muted) !important; font-size: .78rem; font-weight: 600;}
.app-footer .sep {color: var(--navbar-border) !important; font-size: .8rem; font-weight: 400;}

[data-testid="stBottom"], footer, [data-testid="stFooter"] {display: none !important;}
</style>
""",
    unsafe_allow_html=True,
)


# --------------------------------------------------------------------------- #
# Shared result renderers
# --------------------------------------------------------------------------- #
def show_package(response: AgentResponse, key_prefix: str) -> None:
    if response.spec is None:
        raise ValueError("Cannot render Terraform until required fields are provided.")

    files = render_files(response.spec)
    st.success(response.summary)
    metrics = st.columns(4)
    metrics[0].metric("Skills", len(response.spec.skills))
    metrics[1].metric("Agents", len(response.spec.agents))
    metrics[2].metric("Flows", len(response.spec.contact_flows))
    metrics[3].metric("DNIS", len(response.spec.dnis))

    left, right = st.columns([1, 1.4])
    with left:
        st.subheader("Validated specification")
        st.json(response.spec.model_dump(exclude={"assumptions"}))
        if response.spec.assumptions:
            st.info("Assumptions: " + "; ".join(response.spec.assumptions))
        for warning in response.warnings:
            st.warning(warning)
    with right:
        st.subheader("Terraform preview")
        selected = st.selectbox(
            "File", list(files), key=f"{key_prefix}_file", label_visibility="collapsed"
        )
        st.code(files[selected], language="hcl")

    st.download_button(
        "Download Terraform package",
        data=files_to_zip(files),
        file_name=f"{response.spec.instance_alias}-terraform.zip",
        mime="application/zip",
        type="primary",
        key=f"{key_prefix}_download",
    )
    github_publish_panel(
        files,
        key_prefix=key_prefix,
        default_commit_message=f"Add generated Terraform for {response.spec.instance_alias}",
    )


def workbook_error_message(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        details = []
        for error in exc.errors():
            location = " → ".join(str(part) for part in error["loc"])
            details.append(f"{location}: {error['msg']}")
        return "Workbook validation failed:\n\n" + "\n\n".join(details)
    return str(exc)


def show_focused_package(
    files: dict[str, str],
    *,
    summary: str,
    filename: str,
    key_prefix: str,
) -> None:
    st.success(summary)
    selected = st.selectbox(
        "Terraform file",
        list(files),
        key=f"{key_prefix}_file",
        label_visibility="collapsed",
    )
    st.code(files[selected], language="hcl")
    st.download_button(
        "Download Terraform package",
        data=files_to_zip(files),
        file_name=filename,
        mime="application/zip",
        type="primary",
        key=f"{key_prefix}_download",
        use_container_width=True,
    )
    safe_directory = filename.rsplit(".zip", 1)[0] or "terraform"
    github_publish_panel(
        files,
        key_prefix=key_prefix,
        default_commit_message=f"Add generated Terraform: {safe_directory}",
    )


def page_head(title: str, subtitle: str) -> None:
    st.markdown(
        f'<div class="page-head"><h2>{title}</h2><p>{subtitle}</p></div>',
        unsafe_allow_html=True,
    )


TEMPLATE_PATH = (
    Path(__file__).resolve().parent
    / "outputs"
    / "connectcraft"
    / "amazon_connect_requirements_template.xlsx"
)


# --------------------------------------------------------------------------- #
# Pages
# --------------------------------------------------------------------------- #
def render_overview() -> None:
    st.markdown(
        '<div class="hero">'
        '<div class="hero-badge">&#10022; CCaaS Migration Accelerator</div>'
        "<h2>Turn legacy requirements<br>into reviewed Terraform</h2>"
        "<p>Complete an Excel template or a quick form and generate deterministic "
        "Terraform for Amazon Connect — instance, skills, agents, contact flows, "
        "and DNIS. The tool never runs <code>terraform apply</code>.</p>"
        '<div class="hero-stats">'
        '<div class="stat"><div class="num">100%</div><div class="lbl">Deterministic HCL</div></div>'
        '<div class="stat"><div class="num">0</div><div class="lbl">Arbitrary model output</div></div>'
        '<div class="stat"><div class="num">5</div><div class="lbl">Resource types</div></div>'
        '<div class="stat"><div class="num">&#8734;</div><div class="lbl">Human reviews</div></div>'
        "</div>"
        "</div>",
        unsafe_allow_html=True,
    )
    st.write("")

    cards = [
        ("📊", "Excel workflow", "Download the six-worksheet template, fill it in, and "
         "upload it for a deterministic, validated parse."),
        ("⚡", "Quick setup", "Skip the spreadsheet — define an instance, routing skills, "
         "and agents with explicit form fields."),
        ("🔗", "Existing DNIS", "Attach a new contact flow to a phone number already "
         "claimed in Amazon Connect."),
        ("🛡️", "Safe by design", "Typed requirements, deterministic HCL, and human plan "
         "review. No arbitrary model-generated Terraform."),
    ]
    columns = st.columns(len(cards))
    for column, (icon, title, body) in zip(columns, cards):
        column.markdown(
            f'<div class="feature-card">'
            f'<div class="ico-wrap">{icon}</div>'
            f"<h4>{title}</h4><p>{body}</p></div>",
            unsafe_allow_html=True,
        )

    st.write("")
    st.markdown("#### How it works")
    flow = [
        ("1", "Describe", "Fill the Excel template or complete the quick setup form."),
        ("2", "Validate", "Requirements are parsed into a typed, validated spec."),
        ("3", "Preview", "Review the generated main.tf, variables.tf, outputs.tf."),
        ("4", "Ship", "Download the ZIP or commit straight to GitHub."),
    ]
    step_cols = st.columns(4)
    for col, (num, title, body) in zip(step_cols, flow):
        col.markdown(
            f'<div class="step-card">'
            f'<div class="step-num">{num}</div>'
            f'<div class="step-title">{title}</div>'
            f'<div class="step-body">{body}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    st.write("")
    st.info(
        "Pick a workflow from the navigation bar above to get started. "
        "Never place API keys, passwords, AWS credentials, or customer data in the workbook."
    )


def render_excel_workflow() -> None:
    page_head(
        "Excel template workflow",
        "Download the requirements template, complete its six worksheets, then upload it.",
    )

    st.markdown(
        '<span class="step-pill">Step 1 · Download</span>', unsafe_allow_html=True
    )
    st.markdown(
        "Use the dedicated **Instance**, **Skills**, **Agents**, **ContactFlows**, and **DNIS** "
        "worksheets. The workbook includes instructions, examples, and validation lists."
    )
    if TEMPLATE_PATH.exists():
        st.download_button(
            "Download Excel template",
            data=TEMPLATE_PATH.read_bytes(),
            file_name=TEMPLATE_PATH.name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary",
            use_container_width=True,
        )
    else:
        st.error("The requirements template is missing from the application package.")

    st.divider()
    st.markdown(
        '<span class="step-pill">Step 2 · Upload &amp; generate</span>',
        unsafe_allow_html=True,
    )
    upload = st.file_uploader(
        "Completed Amazon Connect requirements workbook",
        type=["xlsx"],
        help="Do not include passwords, API keys, AWS credentials, or customer data.",
    )
    generate_clicked = st.button(
        "Generate Terraform package",
        type="primary",
        use_container_width=True,
        disabled=upload is None,
    )

    if generate_clicked and upload is not None:
        try:
            workbook_data = upload.getvalue()
            try:
                with st.spinner("Reading and validating the completed template…"):
                    spec = workbook_to_spec(workbook_data)
                response = AgentResponse(
                    spec=spec,
                    summary=(
                        f"Validated the completed template for {spec.instance_alias} "
                        "without an AI model call."
                    ),
                )
            except NotTemplateWorkbookError:
                request_text = workbook_to_prompt(workbook_data, upload.name)
                with st.spinner("Interpreting the unstructured workbook with OpenRouter…"):
                    response = interpret_requirements(request_text)
            if response.spec is None:
                clarification = response.clarification_question or response.summary
                missing = ", ".join(response.missing_fields)
                detail = f" Required fields: {missing}." if missing else ""
                raise ValueError(f"{clarification}{detail}")
            st.session_state.upload_response = response
            st.session_state.upload_source = upload.name
        except Exception as exc:
            st.session_state.pop("upload_response", None)
            st.session_state.pop("upload_source", None)
            st.error(f"I couldn't generate the package: {workbook_error_message(exc)}")

    if (
        upload is not None
        and st.session_state.get("upload_source") == upload.name
        and "upload_response" in st.session_state
    ):
        st.divider()
        show_package(st.session_state.upload_response, "upload")


def render_quick_setup() -> None:
    page_head(
        "Quick setup form",
        "Create an instance with routing skills and agents — no spreadsheet, no AI model call.",
    )
    manual_response, manual_submitted = manual_builder()
    if manual_submitted:
        if manual_response is None:
            st.session_state.pop("manual_response", None)
        else:
            st.session_state.manual_response = manual_response

    if "manual_response" in st.session_state:
        st.divider()
        show_package(st.session_state.manual_response, "manual")


def render_existing_dnis() -> None:
    page_head(
        "Add a contact flow to an existing DNIS",
        "This creates a contact flow and associates it with a phone number already claimed in Amazon Connect. It does not create an instance or claim another number.",
    )
    dnis_flow_files, dnis_flow_submitted, dnis_flow_name = existing_dnis_flow_builder()
    if dnis_flow_submitted:
        if dnis_flow_files is None:
            st.session_state.pop("dnis_flow_files", None)
            st.session_state.pop("dnis_flow_name", None)
        else:
            st.session_state.dnis_flow_files = dnis_flow_files
            st.session_state.dnis_flow_name = dnis_flow_name

    if "dnis_flow_files" in st.session_state:
        st.divider()
        safe_flow_name = (st.session_state.dnis_flow_name or "contact-flow").replace(" ", "-")
        show_focused_package(
            st.session_state.dnis_flow_files,
            summary=(
                f"Created Terraform to associate **{st.session_state.dnis_flow_name}** "
                "with the existing DNIS."
            ),
            filename=f"{safe_flow_name}-existing-dnis-terraform.zip",
            key_prefix="existing_dnis",
        )


# --------------------------------------------------------------------------- #
# Fixed header
# --------------------------------------------------------------------------- #
PAGES = {
    "overview": ("🏠  Overview", render_overview),
    "excel": ("📊  Excel Workflow", render_excel_workflow),
    "quick": ("⚡  Quick Setup", render_quick_setup),
    "dnis": ("🔗  Existing DNIS", render_existing_dnis),
}

requested = st.query_params.get("page", "overview")
if requested not in PAGES:
    requested = "overview"
if "nav_page" not in st.session_state:
    st.session_state["nav_page"] = requested


def _sync_route() -> None:
    st.query_params["page"] = st.session_state["nav_page"]


with st.container(key="app-header"):
    brand_col, nav_col = st.columns([1.15, 2], vertical_alignment="center")
    with brand_col:
        st.markdown(
            '<div class="navbar-brand">'
            '<div class="logo-box">&#9729;&#65039;</div>'
            '<div class="titles"><h1>AWS Connect Migration Accelerator</h1>',
            unsafe_allow_html=True,
        )
    with nav_col:
        # Remount the control on every navigation by keying its wrapper on the
        # selected page. Streamlit reuses the segmented-control button nodes
        # across reruns and only flips aria-checked/data-selected; Chromium
        # caches the selector match on those reused nodes and never repaints the
        # active-tab styling, so the gold underline sticks to the old tab. A
        # changing wrapper key forces fresh DOM nodes, which style correctly.
        nav_wrap_key = f"navwrap-{st.session_state.get('nav_page', requested)}"
        with st.container(key=nav_wrap_key):
            selected = st.segmented_control(
                "Navigate",
                options=list(PAGES),
                format_func=lambda key: PAGES[key][0],
                key="nav_page",
                on_change=_sync_route,
                label_visibility="collapsed",
            )

active = selected or st.session_state["nav_page"]
st.query_params["page"] = active

# Highlight the active nav tab by position rather than by Streamlit's runtime
# aria-checked/data-selected attributes. Chromium does not reliably repaint
# attribute-selector styling on the reused button nodes between reruns, which
# left the gold underline stuck on the previously-selected tab. This positional
# rule changes with `active`, so each rerun inserts a fresh stylesheet and the
# browser recomputes styles cleanly.
_active_index = list(PAGES).index(active) + 1
_nav_active_style = f"""
<style>
.st-key-app-header [data-testid="stButtonGroup"]
  button[data-variant="segmented_control"]:nth-of-type({_active_index}),
.st-key-app-header [data-testid="stButtonGroup"]
  button[data-variant="segmented_control"]:nth-of-type({_active_index}) p {{
  color: var(--gold-bright) !important;
  -webkit-text-fill-color: var(--gold-bright) !important;
  font-weight: 700 !important;
  border-bottom-color: var(--gold-bright) !important;
}}
</style>
"""
st.markdown(_nav_active_style, unsafe_allow_html=True)

PAGES[active][1]()


# --------------------------------------------------------------------------- #
# Fixed footer
# --------------------------------------------------------------------------- #
st.markdown(
    '<div class="app-footer"><div class="center">'
    "<span>Deterministic Terraform</span>"
    '<span class="sep">&#183;</span>'
    "<span>No <code>terraform apply</code></span>"
    '<span class="sep">&#183;</span>'
    "<span>Human plan review required</span>"
    "</div></div>",
    unsafe_allow_html=True,
)
