import { ISerializers, unpack_models } from '@jupyter-widgets/base';
import { CanvasModel, CanvasView } from 'ipycanvas';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { VariableMeshModel } from './variable_mesh';
import { FRBModel } from './fixed_res_buffer';
import { ColormapContainerModel } from './colormap_container';

export class WidgytsCanvasModel extends CanvasModel {
  defaults(): any {
    return {
      ...super.defaults(),
      _model_name: WidgytsCanvasModel.model_name,
      _model_module: WidgytsCanvasModel.model_module,
      _model_module_version: WidgytsCanvasModel.model_module_version,
      _view_name: WidgytsCanvasModel.view_name,
      _view_module: WidgytsCanvasModel.view_module,
      _view_module_version: WidgytsCanvasModel.view_module_version,
      min_val: undefined,
      max_val: undefined,
      is_log: true,
      colormap_name: 'viridis',
      colormaps: null,
      frb_model: null,
      variable_mesh_model: null,
      current_field: 'ones',
      image_bitmap: undefined,
      image_data: undefined,
      _dirty_frb: false,
      _dirty_bitmap: false
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  initialize(attributes: any, options: any): void {
    super.initialize(attributes, options);
    this.frb_model = this.get('frb_model');
    this.variable_mesh_model = this.get('variable_mesh_model');
    this.colormaps = this.get('colormaps');
    this.current_field = this.get('current_field');
  }

  static serializers: ISerializers = {
    ...CanvasModel.serializers,
    frb_model: { deserialize: unpack_models },
    variable_mesh_model: { deserialize: unpack_models },
    colormaps: { deserialize: unpack_models }
  };

  min_val: number;
  max_val: number;
  is_log: boolean;
  colormap_name: string;
  frb_model: FRBModel;
  variable_mesh_model: VariableMeshModel;
  colormaps: ColormapContainerModel;
  current_field: string;
  _dirty_frb: boolean;
  _dirty_bitmap: boolean;

  static view_name = 'WidgytsCanvasView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
  static model_name = 'WidgytsCanvasModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}

export class WidgytsCanvasView extends CanvasView {
  render(): void {
    /* This is where we update stuff!
     * Render in the base class will set up the ctx, but also calls
     * updateCanvas, so we need to check before calling anything in there.
     */
    this.drag = false;
    this.locked = true;
    super.render();
    this.initializeArrays().then(() => {
      this.setupEventListeners();
      this.locked = false;
      this.updateCanvas();
    });
  }
  image_buffer: Uint8ClampedArray;
  image_data: ImageData;
  image_bitmap: ImageBitmap;
  model: WidgytsCanvasModel;
  locked: boolean;
  drag: boolean;
  dragStart: [number, number];
  dragStartCenter: [number, number];
  frbWidth: [number, number];

  setupEventListeners(): void {
    this.model.frb_model.on_some_change(
      ['width', 'height'],
      this.resizeFromFRB,
      this
    );
    this.model.frb_model.on_some_change(
      ['view_center', 'view_width'],
      this.dirtyFRB,
      this
    );
    this.model.on_some_change(
      ['_dirty_frb', '_dirty_bitmap'],
      this.updateBitmap,
      this
    );
    this.model.on_some_change(
      ['min_val', 'max_val', 'colormap_name', 'is_log'],
      this.dirtyBitmap,
      this
    );
    this.model.on('change:current_field', this.updateCurrentField, this);
    this.el.addEventListener('wheel', this.conductZoom.bind(this));
    this.el.addEventListener('mousedown', this.startDrag.bind(this));
    this.el.addEventListener('mousemove', this.conductDrag.bind(this));
    window.addEventListener('mouseup', this.endDrag.bind(this));
  }

  async updateCurrentField(): Promise<void> {
    this.model.current_field = this.model.get('current_field');
    this.dirtyBitmap();
    this.dirtyFRB();
    return this.updateBitmap();
  }

  conductZoom(event: WheelEvent): void {
    event.preventDefault();
    const view_width: [number, number] = this.model.frb_model.get('view_width');
    let n_units = 0;
    if (event.deltaMode === event.DOM_DELTA_PIXEL) {
      // let's say we have 9 units per image
      n_units = event.deltaY / (this.frbWidth[1] / 10);
    } else if (event.deltaMode === event.DOM_DELTA_LINE) {
      // two lines per unit let's say
      n_units = event.deltaY / 2;
    } else if (event.deltaMode === event.DOM_DELTA_PAGE) {
      // yeah i don't know
      return;
    }
    const zoomFactor: number = 1.1 ** n_units;
    const new_view_width: [number, number] = [
      view_width[0] * zoomFactor,
      view_width[1] * zoomFactor
    ];
    this.model.frb_model.set('view_width', new_view_width);
    this.model.frb_model.save_changes();
  }

  startDrag(event: MouseEvent): void {
    this.drag = true;
    this.dragStart = [event.offsetX, event.offsetY];
    this.dragStartCenter = this.model.frb_model.get('view_center');
  }

  conductDrag(event: MouseEvent): void {
    if (!this.drag) {
      return;
    }
    const shiftValue: [number, number] = [
      event.offsetX - this.dragStart[0],
      event.offsetY - this.dragStart[1]
    ];
    // Now we shift the actual center
    const view_width: [number, number] = this.model.frb_model.get('view_width');
    const dx = view_width[0] / this.frbWidth[0]; // note these are FRB dims, which are *pixel* dims, not display dims
    const dy = (view_width[1] / this.frbWidth[1]) * -1; // origin is upper left, so flip dy
    const new_view_center: [number, number] = [
      this.dragStartCenter[0] - dx * shiftValue[0],
      this.dragStartCenter[1] - dy * shiftValue[1]
    ];
    this.model.frb_model.set('view_center', new_view_center);
  }

  endDrag(event: MouseEvent): void {
    if (!this.drag) {
      return;
    }
    this.drag = false;
    this.model.frb_model.save_changes();
  }

  dirtyBitmap(): void {
    this.model.set('_dirty_bitmap', true);
  }

  dirtyFRB(): void {
    this.model.set('_dirty_frb', true);
  }

  async initializeArrays(): Promise<void> {
    this.regenerateBuffer(); // This will stick stuff into the FRB's data buffer
    this.resizeFromFRB(); // This will create image_buffer and image_data
    await this.createBitmap(); // This creates a bitmap array and normalizes
  }

  updateCanvas(): void {
    /*
     * We don't call super.updateCanvas here, and we just re-do what it does.
     * This means we'll have to update it when the base class changes, but it
     * also means greater control.
     */
    this.clear();
    if (this.image_bitmap !== undefined) {
      this.ctx.drawImage(this.image_bitmap, 0, 0);
    }
    if (this.model.canvas !== undefined) {
      this.ctx.drawImage(this.model.canvas, 0, 0);
    }
  }

  async updateBitmap(): Promise<void> {
    if (this.locked) {
      return;
    }
    this.locked = true;
    if (this.model.get('_dirty_frb')) {
      this.regenerateBuffer();
    }
    if (this.model.get('_dirty_bitmap')) {
      await this.createBitmap();
      this.updateCanvas();
    }
    this.locked = false;
  }

  resizeFromFRB(): void {
    if (this.model.frb_model !== null && this.ctx !== null) {
      const width = this.model.frb_model.get('width');
      const height = this.model.frb_model.get('height');
      this.frbWidth = [width, height];
      const npix = width * height;
      // Times four so that we have one for *each* channel :)
      this.image_buffer = new Uint8ClampedArray(npix * 4);
      this.image_data = this.ctx.createImageData(width, height);
    }
  }

  regenerateBuffer(): void {
    this.model.frb_model.depositDataBuffer(
      this.model.variable_mesh_model,
      this.model.current_field
    );
    this.model.set('_dirty_frb', false);
    this.model.set('_dirty_bitmap', true);
  }

  async createBitmap(): Promise<void> {
    /*
     * This needs to make sure our deposition is up to date,
     * normalize it, and then re-set our image data
     */
    /* Need to normalize here somehow */
    await this.model.colormaps.normalize(
      this.model.get('colormap_name'),
      this.model.frb_model.data_buffer,
      this.image_buffer,
      this.model.get('min_val'),
      this.model.get('max_val'),
      this.model.get('is_log')
    );
    this.image_data.data.set(this.image_buffer);
    const nx = this.model.frb_model.get('width');
    const ny = this.model.frb_model.get('height');
    /* This has to be called every time image_data changes */
    this.image_bitmap = await createImageBitmap(this.image_data, 0, 0, nx, ny);
    this.model.set('_dirty_bitmap', false);
  }
}
