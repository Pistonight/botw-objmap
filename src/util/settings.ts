export type SettingChangeCb = () => void;
export type SettingBeforeSaveCb = () => void;

export class Settings {
  private static instance: Settings;
  static getInstance() {
    if (!this.instance) {
      const instance = new this();
      this.instance = Object.seal(new Proxy(instance, instance.makeProxyHandler()));
    }
    return this.instance;
  }

  /// Register a callback that will be invoked whenever a setting is modified.
  registerCallback(cb: SettingChangeCb) {
    this.callbacks.push(cb);
  }
  registerBeforeSaveCallback(cb: SettingBeforeSaveCb) {
    this.beforeSaveCallbacks.push(cb);
  }

  shownGroups!: Set<string>;
  drawLayerGeojson!: string;

  colorPerActor!: boolean;

  useActorNames!: boolean;
  useHexForHashIds!: boolean;

  private constructor() {
    this.load();
    window.addEventListener('beforeunload', (event) => {
      this.save();
    });
    console.log('Settings initialised', this);
  }

  private load() {
    const dataStr = localStorage.getItem(Settings.KEY);
    const data = dataStr ? JSON.parse(dataStr) : {};

    this.shownGroups = parse(data.shownGroups, (d) => new Set(d),
      new Set(['Location', 'Dungeon', 'Place', 'Tower', 'Shop', 'Labo']));
    this.drawLayerGeojson = parse(data.drawLayerGeojson, Id, '');
    this.colorPerActor = parse(data.colorPerActor, Id, true);
    this.useActorNames = parse(data.useActorNames, Id, false);
    this.useHexForHashIds = parse(data.useHexForHashIds, Id, true);

    this.invokeCallbacks();
  }

  private save() {
    for (const cb of this.beforeSaveCallbacks)
      cb();
    const data = {
      shownGroups: Array.from(this.shownGroups),
      drawLayerGeojson: this.drawLayerGeojson,
      colorPerActor: this.colorPerActor,
      useActorNames: this.useActorNames,
      useHexForHashIds: this.useHexForHashIds,
    };
    localStorage.setItem(Settings.KEY, JSON.stringify(data));
  }

  private invokeCallbacks() {
    for (const cb of this.callbacks)
      cb();
  }

  private makeProxyHandler(): ProxyHandler<Settings> {
    return {
      set: (target, prop, value) => {
        const r = Reflect.set(target, prop, value);
        if (!r)
          return false;
        this.invokeCallbacks();
        return true;
      },
    };
  }

  private static KEY = 'storage';
  private beforeSaveCallbacks: SettingBeforeSaveCb[] = [];
  private callbacks: SettingChangeCb[] = [];
}

function parse<T>(data: any, parseFn: (data: any) => T, defaultVal: T) {
  if (data !== undefined)
    return parseFn(data);
  return defaultVal;
}

/// Identity function.
function Id(data: any) { return data; }
