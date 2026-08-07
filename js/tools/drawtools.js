export function initializeDrawTool(map, drawnItems) {

    const drawControl = new L.Control.Draw({

        edit:{

            featureGroup:drawnItems

        },

        draw:{

            polygon:true,

            polyline:true,

            rectangle:true,

            circle:true,

            marker:true,

            circlemarker:false

        }

    });

    return drawControl;

}