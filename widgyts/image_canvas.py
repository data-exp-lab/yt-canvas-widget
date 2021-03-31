import ipycanvas
import ipywidgets as ipywidgets
import numpy as np
import traitlets
from ipywidgets import widget_serialization
from ipywidgets.widgets.trait_types import bytes_serialization

from .colormaps import ColormapContainer

try:
    from yt.data_objects.selection_objects import YTSlice
except ImportError:
    from yt.data_objects.selection_data_containers import YTSlice

from yt.data_objects.construction_data_containers import YTQuadTreeProj
from yt.funcs import iter_fields
from yt.visualization.fixed_resolution import FixedResolutionBuffer as frb

from . import EXTENSION_VERSION


@ipywidgets.register
class FieldArrayModel(ipywidgets.Widget):
    _model_name = traitlets.Unicode("FieldArrayModel").tag(sync=True)
    _model_module = traitlets.Unicode("@yt-project/yt-widgets").tag(sync=True)
    _model_module_version = traitlets.Unicode(EXTENSION_VERSION).tag(sync=True)
    field_name = traitlets.Unicode("").tag(sync=True)
    array = traitlets.Bytes(allow_none=False).tag(sync=True, **bytes_serialization)

    @property
    def _array(self):
        return np.frombuffer(self.array, dtype="f8")


@ipywidgets.register
class VariableMeshModel(ipywidgets.Widget):
    _model_name = traitlets.Unicode("VariableMeshModel").tag(sync=True)
    _model_module = traitlets.Unicode("@yt-project/yt-widgets").tag(sync=True)
    _model_module_version = traitlets.Unicode(EXTENSION_VERSION).tag(sync=True)
    px = traitlets.Bytes(allow_none=False).tag(sync=True, **bytes_serialization)
    py = traitlets.Bytes(allow_none=False).tag(sync=True, **bytes_serialization)
    pdx = traitlets.Bytes(allow_none=False).tag(sync=True, **bytes_serialization)
    pdy = traitlets.Bytes(allow_none=False).tag(sync=True, **bytes_serialization)
    data_source = traitlets.Any(allow_none=True).tag(sync=False)
    field_values = traitlets.List(trait=traitlets.Instance(FieldArrayModel)).tag(
        sync=True, **widget_serialization
    )

    @property
    def _px(self):
        return np.frombuffer(self.px, dtype="f8")

    @property
    def _py(self):
        return np.frombuffer(self.py, dtype="f8")

    @property
    def _pdx(self):
        return np.frombuffer(self.pdx, dtype="f8")

    @property
    def _pdy(self):
        return np.frombuffer(self.pdy, dtype="f8")

    def add_field(self, field_name):
        if (
            any(_.field_name == field_name for _ in self.field_values)
            or self.data_source is None
        ):
            return
        v = self.data_source[field_name]
        new_field = FieldArrayModel(field_name=field_name, array=v.tobytes())
        new_field_values = self.field_values + [new_field]
        # Do an update of the trait!
        self.field_values = new_field_values
        mi, ma = v.min(), v.max()
        return mi, ma


@ipywidgets.register
class FRBModel(ipywidgets.Widget):
    _model_name = traitlets.Unicode("FRBModel").tag(sync=True)
    _model_module = traitlets.Unicode("@yt-project/yt-widgets").tag(sync=True)
    _model_module_version = traitlets.Unicode(EXTENSION_VERSION).tag(sync=True)
    width = traitlets.Int(512).tag(sync=True)
    height = traitlets.Int(512).tag(sync=True)
    variable_mesh_model = traitlets.Instance(VariableMeshModel).tag(
        sync=True, **widget_serialization
    )
    view_center = traitlets.Tuple((0.5, 0.5)).tag(sync=True, config=True)
    view_width = traitlets.Tuple((0.2, 0.2)).tag(sync=True, config=True)


@ipywidgets.register
class WidgytsCanvasViewer(ipycanvas.Canvas):
    """View of a fixed resolution buffer.

    FRBViewer(width, height, px, py, pdx, pdy, val)

    This widget creates a view of a fixed resolution buffer of
    size (`width`, `height`) given data variables `px`, `py`, `pdx`, `pdy`,
    and val. Updates on the view of the fixed reolution buffer can be made
    by modifying traitlets `view_center`, `view_width`, or `Colormaps`

    Parameters
    ----------

    width : integer
        The width of the fixed resolution buffer output, in pixels
    height : integer
        The height of the fixed resolution buffer, in pixels
    px : array of floats
        x coordinates for the center of each grid box
    py : array of floats
        y coordinates for the center of each grid box
    pdx : array of floats
        Values of the half-widths for each grid box
    pdy : array of floats
        Values of the half-heights for each grid box
    val : array of floats
        Data values for each grid box
        The data values to be visualized in the fixed resolution buffer.
    colormaps : :class: `widgyts.Colormaps`
        This is the widgyt that controls traitlets associated with the
        colormap.
    view_center : tuple
        This is a length two tuple that represents the normalized center of
        the resulting FRBView.
    view_width : tuple
        This is a length two tuple that represents the height and with of the
        view, normalized to the original size of the image. (0.5, 0.5)
        represents a view of half the total data with and half the total
        data height.

    Examples
    --------
    To create a fixed resolution buffer view of a density field with this
    widget, and then to display it:

    >>> ds = yt.load("IsolatedGalaxy")
    >>> proj = ds.proj("density", "z")
    >>> frb1 = widgyts.FRBViewer(height=512, width=512, px=proj["px"],
    ...                          py=proj["py"], pdx=proj["pdx"],
    ...                          pdy=proj["pdy"], val = proj["density"])
    >>> display(frb1)

    """

    min_val = traitlets.CFloat().tag(sync=True)
    max_val = traitlets.CFloat().tag(sync=True)
    is_log = traitlets.Bool().tag(sync=True)
    colormap_name = traitlets.Unicode("viridis").tag(sync=True)
    colormaps = traitlets.Instance(ColormapContainer).tag(
        sync=True, **widget_serialization
    )
    current_field = traitlets.Unicode("ones", allow_none=False).tag(sync=True)
    frb_model = traitlets.Instance(FRBModel).tag(sync=True, **widget_serialization)
    variable_mesh_model = traitlets.Instance(VariableMeshModel).tag(
        sync=True, **widget_serialization
    )

    _model_name = traitlets.Unicode("WidgytsCanvasModel").tag(sync=True)
    _model_module = traitlets.Unicode("@yt-project/yt-widgets").tag(sync=True)
    _model_module_version = traitlets.Unicode(EXTENSION_VERSION).tag(sync=True)
    _view_name = traitlets.Unicode("WidgytsCanvasView").tag(sync=True)
    _view_module = traitlets.Unicode("@yt-project/yt-widgets").tag(sync=True)
    _view_module_version = traitlets.Unicode(EXTENSION_VERSION).tag(sync=True)

    @traitlets.observe("current_field")
    def _current_field_changed(self, change):
        if change["new"] in self.variable_mesh_model.field_values:
            return
        rv = self.variable_mesh_model.add_field(change["new"])
        if rv is not None:
            self.min_val, self.max_val = rv

    @traitlets.default("layout")
    def _layout_default(self):
        return ipywidgets.Layout(width=f"{self.width}px", height=f"{self.height}px")

    def setup_controls(self):
        down = ipywidgets.Button(
            icon="arrow-down", layout=ipywidgets.Layout(width="auto", grid_area="down")
        )
        up = ipywidgets.Button(
            icon="arrow-up", layout=ipywidgets.Layout(width="auto", grid_area="up")
        )
        right = ipywidgets.Button(
            icon="arrow-right",
            layout=ipywidgets.Layout(width="auto", grid_area="right"),
        )
        left = ipywidgets.Button(
            icon="arrow-left", layout=ipywidgets.Layout(width="auto", grid_area="left")
        )
        zoom_start = 1.0 / (self.frb_model.view_width[0])
        # By setting the dynamic range to be the ratio between coarsest and
        # finest, we ensure that at the fullest zoom, our smallest point will
        # be the size of our biggest point at the outermost zoom.
        dynamic_range = max(
            self.variable_mesh_model._pdx.max(), self.variable_mesh_model._pdy.max()
        ) / min(
            self.variable_mesh_model._pdx.min(), self.variable_mesh_model._pdy.min()
        )

        zoom = ipywidgets.FloatSlider(
            min=0.5,
            max=dynamic_range,
            step=0.1,
            value=zoom_start,
            description="Zoom",
            layout=ipywidgets.Layout(width="auto", grid_area="zoom"),
        )
        is_log = ipywidgets.Checkbox(value=False, description="Log colorscale")
        colormaps = ipywidgets.Dropdown(
            options=list(self.colormaps.colormap_values.keys()),
            description="colormap",
            value="viridis",
        )
        vals = [
            _
            for _ in self.variable_mesh_model.field_values
            if _.field_name == self.current_field
        ][0]._array
        mi = vals.min()
        ma = vals.max()
        min_val = ipywidgets.BoundedFloatText(
            description="lower colorbar bound:", value=mi, min=mi, max=ma
        )
        max_val = ipywidgets.BoundedFloatText(
            description="upper colorbar bound:", value=ma, min=mi, max=ma
        )

        down.on_click(self.on_ydownclick)
        up.on_click(self.on_yupclick)
        right.on_click(self.on_xrightclick)
        left.on_click(self.on_xleftclick)
        zoom.observe(self.on_zoom, names="value")
        # These can be jslinked, so we will do so.
        ipywidgets.jslink((is_log, "value"), (self, "is_log"))
        ipywidgets.jslink((min_val, "value"), (self, "min_val"))
        ipywidgets.link((min_val, "value"), (self, "min_val"))
        ipywidgets.jslink((max_val, "value"), (self, "max_val"))
        ipywidgets.link((max_val, "value"), (self, "max_val"))
        # This one seemingly cannot be.
        ipywidgets.link((colormaps, "value"), (self, "colormap_name"))

        nav_buttons = ipywidgets.GridBox(
            children=[up, left, right, down],
            layout=ipywidgets.Layout(
                width="100%",
                grid_template_columns="33% 34% 33%",
                grid_template_rows="auto auto auto",
                grid_template_areas="""
                                    " . up . "
                                    " left . right "
                                    " . down . "
                                    """,
                grid_area="nav_buttons",
            ),
        )

        all_navigation = ipywidgets.GridBox(
            children=[nav_buttons, zoom],
            layout=ipywidgets.Layout(
                width="300px",
                grid_template_columns="25% 50% 25%",
                grid_template_rows="auto auto",
                grid_template_areas="""
                    ". nav_buttons ."
                    "zoom zoom zoom"
                    """,
            ),
        )

        all_normalizers = ipywidgets.GridBox(
            children=[is_log, colormaps, min_val, max_val],
            layout=ipywidgets.Layout(width="auto"),
        )

        accordion = ipywidgets.Accordion(children=[all_navigation, all_normalizers])

        accordion.set_title(0, "navigation")
        accordion.set_title(1, "colormap controls")

        return accordion

    def on_xrightclick(self, b):
        vc = self.frb_model.view_center
        self.frb_model.view_center = ((vc[0] + 0.01), vc[1])

    def on_xleftclick(self, b):
        vc = self.frb_model.view_center
        self.frb_model.view_center = ((vc[0] - 0.01), vc[1])

    def on_yupclick(self, b):
        vc = self.frb_model.view_center
        self.frb_model.view_center = (vc[0], (vc[1] + 0.01))

    def on_ydownclick(self, b):
        vc = self.frb_model.view_center
        self.frb_model.view_center = (vc[0], (vc[1] - 0.01))

    def on_zoom(self, change):
        vw = self.frb_model.view_width
        width_x = 1.0 / change["new"]
        ratio = width_x / vw[0]
        width_y = vw[1] * ratio
        self.frb_model.view_width = (width_x, width_y)
        # print("canvas center is at: {}".format(center))
        # print("zoom value is: {}".format(change["new"]))
        # print("width of frame is: {}".format(width))
        # print("old edges: {} \n new edges:{}".format(ce, new_bounds))

    @classmethod
    def from_obj(cls, obj, field="density"):
        vm = {_: obj[_].tobytes() for _ in ("px", "py", "pdx", "pdy")}
        # Bootstrap our field array model
        fv = [FieldArrayModel(field_name=field, array=obj[field].tobytes())]
        vmm = VariableMeshModel(**vm, data_source=obj, field_values=fv)
        frb = FRBModel(variable_mesh_model=vmm)
        cmc = ColormapContainer()
        mi, ma = obj[field].min(), obj[field].max()
        wc = cls(
            min_val=mi,
            max_val=ma,
            frb_model=frb,
            variable_mesh_model=vmm,
            colormaps=cmc,
            current_field=field,
        )
        return wc


def display_yt(data_object, field):
    # Note what we are doing here: we are taking *views* of these,
    # as the logic in the ndarray traittype doesn't check for subclasses.
    frb = WidgytsCanvasViewer.from_obj(data_object, field)
    controls = frb.setup_controls()
    return ipywidgets.HBox([controls, frb])


def _2d_display(self, fields=None):
    skip = self._key_fields
    skip += list(set(frb._exclude_fields).difference(set(self._key_fields)))
    self.fields = [k for k in self.field_data if k not in skip]
    if fields is not None:
        self.fields = list(iter_fields(fields)) + self.fields
    if len(self.fields) == 0:
        raise ValueError("No fields found to plot in display()")
    return display_yt(self, self.fields[0])


YTSlice.display = _2d_display
YTQuadTreeProj.display = _2d_display
