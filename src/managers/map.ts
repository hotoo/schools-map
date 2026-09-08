import { IRegionDetail, ISchool } from "./data";

declare const BMap;

export class MapManager {

    static zoomLevel = 15;
    static minZoomLevel = 11;
    static maxZoomLevel = 19;
    bMap = new BMap.Map("container");
    overlays: any[] = [];
    markers: any[] = [];
    hoverLabels: any[] = [];

    onAreaClick?: (title: string, value: string) => void;
    onMapClick?: () => void;

    constructor(onAreaClick?: (title: string, value: string) => void, onMapClick?: () => void) {
        this.onAreaClick = onAreaClick;
        this.onMapClick = onMapClick;
        this.bMap.addControl(new BMap.NavigationControl());
        this.bMap.setMinZoom(MapManager.minZoomLevel);
        this.bMap.setMaxZoom(MapManager.maxZoomLevel);
        this.bMap.enableScrollWheelZoom();
        this.bMap.enableContinuousZoom();
        this.bMap.addEventListener("zoomend", () => this.updateMarkerVisibility());
        this.bMap.addEventListener("click", (event) => {
            if (event.overlay == null && this.onMapClick) {
                this.onMapClick();
            }
        });
    }

    center(x: number, y: number): void {
        this.bMap.centerAndZoom(new BMap.Point(x, y), MapManager.zoomLevel);
    }

    showRegion(region: IRegionDetail) {
        for (const school of region.schools) {
            this.drawSchool(school);
        }
    }

    private drawSchool(school: ISchool): void {
        if (typeof school.value === "string") {
            school.value = [school.value];
        }

        for (const path of school.value) {
            this.drawShape(path, school.title, school.marker);
        }
    }

    static shapePolygonStyle = { strokeWeight: 2, strokeOpacity: 0.5, fillOpacity: 0.3 };

    private drawShape(value: string, title: string, markerStr?: string): void {
        const { marker, polygon, hoverLabel } = MapManager.drawSchoolShape(
            this.bMap,
            value,
            title,
            markerStr,
            this.onAreaClick
        );
        this.overlays.push(marker, polygon, hoverLabel);
        this.markers.push(marker);
        this.hoverLabels.push(hoverLabel);
        this.updateMarkerVisibility();
    }

    clear(): void {
        for (const overlay of this.overlays) {
            this.bMap.removeOverlay(overlay);
        }
        this.overlays = [];
        this.markers = [];
        this.hoverLabels = [];
    }

    private updateMarkerVisibility(): void {
        const visible = this.bMap.getZoom() > 14;
        for (const marker of this.markers) {
            visible ? marker.show() : marker.hide();
        }
        if (visible) {
            for (const label of this.hoverLabels) {
                label.hide();
            }
        }
    }

    static drawSchoolShape(
        bMap: any,
        value: string,
        title: string,
        markerStr?: string,
        onAreaClick?: (title: string, value: string) => void
    ): { marker: any, polygon: any, hoverLabel: any } {
        const data = value.split(";").map(s => s.split(",").map(Number));

        let center: number[] | null = null;
        if (markerStr) {
            center = markerStr.split(",").map(Number);
        } else {
            center = data.reduce(function (sum, p) {
                sum[0] += p[0];
                sum[1] += p[1];
                return sum;
            }, [0, 0]).map(v => v / data.length);
        }

        const marker = new BMap.Marker(new BMap.Point(center[0], center[1]));
        bMap.addOverlay(marker);
        if (!markerStr) {
            const localSearch = new BMap.LocalSearch(bMap, {
                onSearchComplete: (results) => {
                    if (results && results.getCurrentNumPois() > 0) {
                        marker.setPosition(results.getPoi(0).point);
                    }
                }
            });
            localSearch.search(title);
        }
        marker.setLabel(new BMap.Label(title, { offset: new BMap.Size(20, -10) }));

        const polygon = new BMap.Polygon(
            data.map(p => new BMap.Point(p[0], p[1])),
            MapManager.shapePolygonStyle
        );
        polygon.addEventListener("mouseover", () => polygon.setFillOpacity(0.01));
        polygon.addEventListener("mouseout", () => polygon.setFillOpacity(MapManager.shapePolygonStyle.fillOpacity));
        if (onAreaClick) {
            polygon.addEventListener("click", () => onAreaClick(title, value));
        }

        const hoverLabel = new BMap.Label(title, { offset: new BMap.Size(10, -10) });
        hoverLabel.hide();
        polygon.addEventListener("mouseover", (event) => {
            if (bMap.getZoom() <= 14) {
                hoverLabel.setPosition(event.point);
                hoverLabel.show();
            }
        });
        polygon.addEventListener("mousemove", (event) => {
            if (bMap.getZoom() <= 14) {
                hoverLabel.setPosition(event.point);
            }
        });
        polygon.addEventListener("mouseout", () => hoverLabel.hide());
        bMap.addOverlay(hoverLabel);
        bMap.addOverlay(polygon);

        return { marker, polygon, hoverLabel };
    }
}