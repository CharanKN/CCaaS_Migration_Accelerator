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
    """Return the *resolved* active theme ('light' or 'dark').

    ``st.context.theme.type`` already collapses the user's "System" choice to the
    concrete light/dark value the browser is showing, which is exactly what we
    need to pick a readable palette.
    """
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


# Header/footer keep the same navy+gold brand in both themes; only the scrollable
# body between them adapts to light vs dark so every widget stays readable.
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
    },
}

# The theme (System/Light/Dark) is chosen from Streamlit's native menu in the
# top-right corner; we follow whatever it resolves to so the palette stays in sync.
_THEME = resolve_theme()
_TOKENS = {**_COMMON_TOKENS, **_THEME_TOKENS[_THEME]}
_ROOT_VARS = " ".join(f"--{name}: {value};" for name, value in _TOKENS.items())

# Emit the theme-dependent CSS custom properties, then a static stylesheet that
# only references them so switching light/dark repaints the whole app.
st.markdown(f"<style>:root {{ {_ROOT_VARS} }}</style>", unsafe_allow_html=True)

st.markdown(
    """
<style>
/* ---- App shell: fixed header, scrollable body, fixed footer ------------- */
.stApp {
  color: var(--text);
  background: var(--page-bg) fixed;
}

/* Streamlit's own top bar overlaps our fixed header. Make it transparent AND
   click-through so our header tabs are fully clickable, while re-enabling
   pointer events on its toolbar so the top-right ⋮ menu (theme settings) works. */
[data-testid="stHeader"] {background: transparent !important; pointer-events: none !important;}
[data-testid="stToolbar"], [data-testid="stMainMenu"] {pointer-events: auto !important;}
[data-testid="stToolbar"] {z-index: 1000 !important;}

/* Hide the sidebar entirely so the header/footer span the full width. */
[data-testid="stSidebar"],
[data-testid="stSidebarCollapsedControl"],
[data-testid="collapsedControl"] {display: none !important;}

/* The body is the block-container; pad it so content clears the fixed bars. */
.block-container {
  max-width: 1180px;
  padding-top: calc(var(--navbar-h) + 1.1rem);
  padding-bottom: calc(var(--footer-h) + 1.6rem);
}

h1, h2, h3, h4, h5, p, li, label, .stMarkdown,
[data-testid="stWidgetLabel"], [data-testid="stMetricValue"] {
  color: var(--text) !important;
}

[data-testid="stFileUploaderDropzone"], [data-testid="stMetric"],
[data-testid="stExpander"], div[data-testid="stCodeBlock"] {
  background: var(--panel-bg) !important;
  border: 1px solid var(--panel-border) !important;
  border-radius: 14px !important;
}

[data-testid="stFileUploaderDropzone"] small,
[data-testid="stFileUploaderDropzoneInstructions"] div,
[data-testid="stMetricLabel"],
.stCaption, .stCaption p {color: var(--text-muted) !important;}

.stButton > button, .stDownloadButton > button {
  color: #031a45 !important;
  font-weight: 800 !important;
  background: linear-gradient(135deg, var(--gold), var(--gold-bright)) !important;
  border: 1px solid #fff1bd !important;
  border-radius: 10px !important;
  box-shadow: 0 0 18px rgba(246, 196, 83, .24);
  transition: transform .08s ease, box-shadow .2s ease;
}
.stButton > button:hover, .stDownloadButton > button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(246, 196, 83, .34);
}
.stDownloadButton > button p, .stDownloadButton > button span,
.stDownloadButton > button div {color: #031a45 !important; font-weight: 900 !important;}

.stButton > button:disabled {
  color: #031a45 !important;
  background: linear-gradient(135deg, var(--gold), var(--gold-bright)) !important;
  border-color: #fff1bd !important;
  box-shadow: 0 0 18px rgba(246, 196, 83, .18);
  opacity: .62;
}
.stButton > button:disabled p, .stButton > button:disabled span,
.stButton > button:disabled div {color: #031a45 !important; font-weight: 900 !important;}

hr {border-color: var(--panel-border);}

/* ---- Fixed header holding the brand + underlined nav tabs --------------- */
.st-key-app-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  min-height: var(--navbar-h);
  padding: .1rem 3.4rem .1rem 1.8rem;
  background: var(--navbar-bg);
  border-bottom: 1px solid var(--navbar-border);
  box-shadow: 0 6px 22px rgba(0, 0, 0, .38);
}
.st-key-app-header [data-testid="stHorizontalBlock"] {align-items: center;}

.navbar-brand {display: flex; align-items: center; gap: .7rem;}
.navbar-brand .logo {font-size: 1.9rem; line-height: 1;}
.navbar-brand .titles h1 {
  margin: 0 !important;
  color: var(--navbar-fg) !important;
  font-size: 1.22rem; line-height: 1.15; letter-spacing: .2px;
}
.navbar-brand .titles p {
  margin: 0 !important;
  color: var(--navbar-fg-muted) !important;
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1.6px;
}

/* ---- Inputs follow the active palette so forced light/dark stays readable */
.stTextInput input, .stNumberInput input, .stTextArea textarea, .stDateInput input,
[data-baseweb="input"], [data-baseweb="base-input"], [data-baseweb="select"] > div {
  background: var(--panel-bg) !important;
  color: var(--text) !important;
}
[data-baseweb="popover"] [role="listbox"],
[data-baseweb="menu"], [data-baseweb="menu"] li {
  background: var(--panel-bg) !important;
  color: var(--text) !important;
}
input::placeholder, textarea::placeholder {color: var(--text-muted) !important; opacity: .8;}

/* ---- Underlined nav tabs inside the header (no boxes) ------------------- */
.st-key-app-header [data-testid="stSegmentedControl"] {display: flex; justify-content: flex-end;}
/* Strip the segmented control's group chrome so tabs read as plain links. */
.st-key-app-header [data-testid="stSegmentedControl"] > div {
  background: transparent !important;
  border: none !important;
  gap: .4rem;
  flex-wrap: wrap;
}
.st-key-app-header [data-testid="stSegmentedControl"] button {
  background: transparent !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  color: var(--navbar-fg-muted) !important;
  font-weight: 700 !important;
  padding: .3rem .35rem !important;
  margin: 0 .35rem !important;
  transition: color .12s ease, border-color .12s ease;
}
.st-key-app-header [data-testid="stSegmentedControl"] button p {color: inherit !important;}
.st-key-app-header [data-testid="stSegmentedControl"] button:hover {
  color: var(--navbar-fg) !important;
  border-bottom-color: rgba(246, 196, 83, .5) !important;
  background: transparent !important;
}
.st-key-app-header [data-testid="stSegmentedControl"] button[aria-checked="true"],
.st-key-app-header [data-testid="stSegmentedControl"] button[aria-selected="true"],
.st-key-app-header [data-testid="stSegmentedControl"] button[kind="segmented_controlActive"],
.st-key-app-header [data-testid$="Active"] {
  color: var(--gold-bright) !important;
  background: transparent !important;
  border-bottom-color: var(--gold) !important;
}

/* ---- Page hero / cards -------------------------------------------------- */
.page-head {margin: .2rem 0 1.2rem;}
.page-head h2 {margin: 0 !important; color: var(--heading) !important; font-size: 1.55rem;}
.page-head p {margin: .25rem 0 0 !important; color: var(--text-muted) !important;}

.hero {
  padding: 1.6rem 1.8rem;
  border: 1px solid var(--panel-border); border-radius: 18px;
  background: var(--hero-bg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, .18);
}
.hero h2 {margin: 0 0 .4rem !important; color: var(--heading) !important; font-size: 1.9rem;}
.hero p {color: var(--text-muted) !important; font-size: 1rem; margin: 0 !important;}
.hero code, .app-footer code {color: var(--gold) !important;}

.feature-card {
  height: 100%;
  padding: 1.1rem 1.2rem;
  border: 1px solid var(--panel-border); border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
}
.feature-card .ico {font-size: 1.5rem;}
.feature-card h4 {margin: .5rem 0 .3rem !important; color: var(--heading) !important; font-size: 1.05rem;}
.feature-card p {margin: 0 !important; color: var(--text-muted) !important; font-size: .88rem; line-height: 1.45;}

.step-pill {
  display: inline-flex; align-items: center; gap: .5rem;
  padding: .28rem .8rem; margin-bottom: .5rem;
  border: 1px solid var(--panel-border); border-radius: 999px;
  background: var(--pill-bg);
  color: var(--pill-fg) !important; font-weight: 700; font-size: .82rem;
}

.muted {color: var(--text-muted) !important;}

/* ---- Fixed footer (centered content) ------------------------------------ */
.app-footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 100;
  min-height: var(--footer-h);
  padding: .55rem 1.8rem;
  border-top: 1px solid var(--navbar-border);
  background: var(--navbar-bg);
  box-shadow: 0 -6px 22px rgba(0, 0, 0, .38);
  display: flex; align-items: center; justify-content: center;
}
.app-footer .center {
  display: flex; flex-wrap: wrap; gap: 1.8rem;
  align-items: center; justify-content: center;
}
.app-footer .center span {color: var(--navbar-fg-muted) !important; font-size: .8rem; font-weight: 600;}

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
        "<h2>Turn requirements into reviewed Terraform</h2>"
        "<p>Complete an Excel template or a quick form, and generate deterministic "
        "Terraform for Amazon Connect — instance, skills, agents, contact flows, and "
        "DNIS. The tool never runs <code>terraform apply</code>.</p>"
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
            f'<div class="feature-card"><div class="ico">{icon}</div>'
            f"<h4>{title}</h4><p>{body}</p></div>",
            unsafe_allow_html=True,
        )

    st.write("")
    st.markdown("#### How it works")
    steps = st.columns(4)
    flow = [
        ("1", "Describe", "Fill the Excel template or a quick form."),
        ("2", "Validate", "Requirements are parsed into a typed, validated spec."),
        ("3", "Preview", "Review the generated `main.tf`, `variables.tf`, `outputs.tf`."),
        ("4", "Ship", "Download the ZIP or commit straight to GitHub."),
    ]
    for column, (num, title, body) in zip(steps, flow):
        column.markdown(
            f'<span class="step-pill">Step {num}</span>',
            unsafe_allow_html=True,
        )
        column.markdown(f"**{title}**")
        column.caption(body)

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
            st.error(f"I couldn’t generate the package: {workbook_error_message(exc)}")

    if (
        upload is not None
        and st.session_state.get("upload_source") == upload.name
        and "upload_response" in st.session_state
    ):
        st.divider()
        show_package(st.session_state.upload_response, "upload")


def render_quick_setup() -> None:
    page_head(
        "Quick setup",
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
        "Create a contact flow and associate it with a phone number already claimed in Amazon Connect.",
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
# Fixed header (app title only)
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
            '<div class="navbar-brand"><span class="logo">☁️</span>'
            '<div class="titles"><h1>AWS Connect Migration Accelerator</h1>'
            "<p>Legacy → Terraform → AWS Connect</p></div></div>",
            unsafe_allow_html=True,
        )
    with nav_col:
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

# Render the active page in the scrollable body.
PAGES[active][1]()


# --------------------------------------------------------------------------- #
# Fixed footer
# --------------------------------------------------------------------------- #
st.markdown(
    '<div class="app-footer">'
    # '<div class="left"></div>'
    '<div class="center">'
    "<span>Deterministic Terraform</span>"
    "<span>No <code>terraform apply</code></span>"
    "<span>Human plan review required</span>"
    "</div></div>",
    unsafe_allow_html=True,
)
