import type * as Cesium from "cesium";

export const T = {
  bg: "#070A10",
  green: "#00E87A",
  amber: "#F5A623",
  red: "#FF453A",
  blue: "#009ADE",
  teal: "#3DD9C4",
};

export interface CesiumDrawContext {
  viewer: Cesium.Viewer;
  entityIds: string[];
  addEntity: (id: string, options: Cesium.Entity.ConstructorOptions) => void;
}
