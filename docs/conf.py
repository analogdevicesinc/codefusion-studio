import datetime
from os import path

# -- Project information -----------------------------------------------------

repository = "codefusion-studio"
project = "Codefusion Studio"
year_now = datetime.datetime.now().year
copyright = f"2024-{year_now}, Analog Devices, Inc"

# -- General configuration ---------------------------------------------------

extensions = [
    "myst_parser",
    "adi_doctools",
]

myst_enable_extensions = [
		"attrs_inline",
]

myst_heading_anchors = 4 # Header depth to autogenerate anchors

# -- Options for HTML output -------------------------------------------------

html_theme = "harmonic"
html_favicon = path.join("assets", "images", "cfs-logo.svg")

html_static_path = ["assets"]

html_theme_options = {
    "light_logo": path.join("images", "cfs-logo.svg"),
}
