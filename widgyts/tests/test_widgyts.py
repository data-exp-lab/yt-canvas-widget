"""Test widgyts and trait linking"""

from unittest import TestCase

# import pytest
from numpy import array_equal

from widgyts import AMRDomainViewer, DatasetViewer, WidgytsCanvasViewer
from yt.testing import fake_amr_ds

# from traitlets import HasTraits, TraitError


class TestWidgytsCanvasViewer(TestCase):
    def setUp(self):
        ds = fake_amr_ds(fields=["density"])
        s = ds.r[:, :, 0.5]
        self.data = s
        self.viewer = WidgytsCanvasViewer.from_obj(self.data, "density")

    def test_viewer_traits(self):
        """Checks that the WidgytsCanvasViewer widget has the expected traits """
        trait_list = [
            "min_val",
            "max_val",
            "colormaps",
            "frb_model",
            "colormap_name",
            "variable_mesh_model",
            "is_log",
        ]
        for trait in trait_list:
            assert self.viewer.has_trait(trait)

    def test_vrb_traits(self):
        """Check that the FRB model has the appropriate traits"""
        trait_list = [
            "width",
            "height",
            "variable_mesh_model",
            "view_center",
            "view_width",
        ]
        for trait in trait_list:
            assert self.viewer.frb_model.has_trait(trait)

    def test_vm_arrays(self):
        """Checks that the arrays passed into the WidgytsCanvasViewer match the original
        data"""
        vm = self.viewer.variable_mesh_model
        px = self.data["px"]
        py = self.data["py"]
        pdx = self.data["pdx"]
        pdy = self.data["pdy"]
        val = self.data["density"]

        assert array_equal(px, vm._px)
        assert array_equal(py, vm._py)
        assert array_equal(pdx, vm._pdx)
        assert array_equal(pdy, vm._pdy)
        assert array_equal(val, vm.field_values[0]._array)


class TestControls(TestCase):
    def setUp(self):
        ds = fake_amr_ds(fields=["density"])
        s = ds.r[:, :, 0.5]
        self.wcv_dens = WidgytsCanvasViewer.from_obj(s, "density")
        controls = self.wcv_dens.setup_controls()
        self.navigation_controls = controls.children[0]
        self.colormap_controls = controls.children[1]

    def test_logscale(self):
        """This test checks that the controls to the log scale of the colormap
        are passed from the controls to the colormap widget"""
        self.assertEqual(self.colormap_controls.children[0].value, self.wcv_dens.is_log)

        self.colormap_controls.children[0].value = False

        self.assertEqual(self.colormap_controls.children[0].value, self.wcv_dens.is_log)

    def test_mapchange(self):
        """Test to check that changing the colormap name from the controls
        widget links to the colormap map_name trait"""
        self.assertEqual(
            self.colormap_controls.children[1].value, self.wcv_dens.colormap_name
        )

        self.colormap_controls.children[1].value = "doom"

        self.assertEqual(
            self.colormap_controls.children[1].value, self.wcv_dens.colormap_name
        )

    def test_colorbar_min_change(self):
        """Test to check that the min val control links to the colormap scale
        minimum value in the colormap widget"""
        # self.assertAlmostEqual(self.colormap_controls.children[2].value,
        #                   self.wcv_dens.colormaps.min_val)

        self.colormap_controls.children[2].value = 1.52e-03

        self.assertAlmostEqual(
            self.colormap_controls.children[2].value, self.wcv_dens.min_val
        )

    def test_colorbar_max_change(self):
        """Test to check that the max val control links to the colormap scale
        minimum value in the colormap widget"""
        # self.assertAlmostEqual(self.colormap_controls.children[3].value,
        #                   self.wcv_dens.colormaps.max_val)

        self.colormap_controls.children[3].value = 5.52e-03

        self.assertAlmostEqual(
            self.colormap_controls.children[3].value, self.wcv_dens.max_val
        )

    def test_zoom_view(self):
        """Test to check that the view width is changed as the zoom value
        slider changes"""
        zoom_control = self.navigation_controls.children[1]
        last_view = self.wcv_dens.frb_model.view_width
        # right now the zoom control doesn't immediately link to the width, so
        # we want to test that the linking happens after an update. They won't
        # match before.

        changing_views = [1.2, 2.0, 3.0, 4.0, 4.5]
        for view in changing_views:
            zoom_control.value = view
            self.assertNotEqual(self.wcv_dens.frb_model.view_width, last_view)
            last_view = self.wcv_dens.frb_model.view_width


class TestDatasetViewer(TestCase):
    def setUp(self):
        ds = fake_amr_ds(fields=["density"])
        self.viewer = DatasetViewer(ds=ds)

    def test_component_traits(self):
        trait_list = ["ds", "components"]
        for trait in trait_list:
            assert self.viewer.has_trait(trait)

        # This should also have an AMR domain viewer

        assert len(self.viewer.components) == 3

    def test_amr_data_viewer(self):

        assert isinstance(self.viewer.components[0], AMRDomainViewer)
        adv = self.viewer.components[0]

        trait_list = ["domain_axes", "grid_views", "renderer", "cmap_truncate"]
        for trait in trait_list:
            assert adv.has_trait(trait)
