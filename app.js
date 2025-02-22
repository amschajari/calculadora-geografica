document.addEventListener('DOMContentLoaded', () => {
    // Inicializar mapa centrado en Entre Ríos
    const map = L.map('map').setView([-32.0589, -59.2276], 8);

    // Definir capas base
    const openstreetmapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
    });

    const esriSatelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: ' Esri'
    });

    // Agregar capas base al mapa
    const baseMaps = {
        "OpenStreetMap": openstreetmapLayer,
        "Esri Satellite": esriSatelliteLayer
    };

    // Agregar capa OpenStreetMap por defecto
    openstreetmapLayer.addTo(map);

    // Crear control de capas en el mapa
    const layersControl = L.control.layers(baseMaps, null, { 
        position: 'topright',
        collapsed: true 
    }).addTo(map);

    // Configuración inicial de Leaflet Draw
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    let drawControl = new L.Control.Draw({
        draw: {
            polygon: true,
            polyline: true,
            circle: false,
            rectangle: false,
            circlemarker: true,
            marker: false
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    // Variable para rastrear el estado de edición
    let isEditMode = false;

    // Función para reiniciar el control de dibujo
    function resetDrawControl() {
        // Eliminar el control de dibujo existente
        map.removeControl(drawControl);
        
        // Recrear el control de dibujo con todas las herramientas
        drawControl = new L.Control.Draw({
            draw: {
                polygon: true,
                polyline: true,
                circle: false,
                rectangle: false,
                circlemarker: true,
                marker: false
            },
            edit: {
                featureGroup: drawnItems
            }
        });
        
        // Agregar nuevo control
        map.addControl(drawControl);
        
        // Desactivar modo de edición si estaba activo
        if (isEditMode) {
            isEditMode = false;
            document.getElementById('edit-btn').textContent = 'Editar'; 
        }
    }

    // Botón de limpiar marcadores
    document.getElementById('clear-btn').addEventListener('click', () => {
        drawnItems.clearLayers();
        resetDrawControl(); // Restaurar todas las herramientas de dibujo
    });

    // Botón de editar
    document.getElementById('edit-btn').addEventListener('click', () => {
        // Alternar modo de edición
        isEditMode = !isEditMode;

        if (isEditMode) {
            // Configurar control de edición
            map.removeControl(drawControl);
            drawControl = new L.Control.Draw({
                draw: false,
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                }
            });
            map.addControl(drawControl);
            document.getElementById('edit-btn').textContent = 'Terminar edición';
            
            // Activar edición de características existentes
            drawnItems.eachLayer((layer) => {
                if (layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
                    layer.editing.enable();
                }
            });
        } else {
            // Desactivar edición de todas las características
            drawnItems.eachLayer((layer) => {
                if (layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
                    layer.editing.disable();
                }
            });
            
            // Restaurar control de dibujo normal
            map.removeControl(drawControl);
            drawControl = new L.Control.Draw({
                draw: {
                    polygon: true,
                    polyline: true,
                    circle: false,
                    rectangle: false,
                    circlemarker: true,
                    marker: false
                },
                edit: {
                    featureGroup: drawnItems
                }
            });
            map.addControl(drawControl);
            
            // Asegurar que el botón vuelva a su estado original
            document.getElementById('edit-btn').textContent = 'Editar';
        }
    });

    // GPS Location Button
    document.getElementById('gps-btn').addEventListener('click', () => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;

              // Center map on current location
              map.setView([lat, lon], 15);

              // Add a marker for current location
              const gpsMarker = L.circleMarker([lat, lon], {
                radius: 8,
                fillColor: "#FF9800",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
              }).addTo(map);

              gpsMarker.bindPopup("Estoy aquí").openPopup();
            },
            (error) => {
              switch(error.code) {
                case error.PERMISSION_DENIED:
                  alert("Permiso de ubicación denegado.");
                  break;
                case error.POSITION_UNAVAILABLE:
                  alert("Información de ubicación no disponible.");
                  break;
                case error.TIMEOUT:
                  alert("Tiempo de espera agotado para obtener ubicación.");
                  break;
                default:
                  alert("Error desconocido al obtener ubicación.");
              }
            }
          );
        } else {
          alert("Geolocalización no soportada por este navegador.");
        }
    });

    // Función para manejar los botones de dibujo
    function setupDrawButton(buttonId, drawType) {
        document.getElementById(buttonId).addEventListener('click', () => {
            // Salir del modo de edición si estaba activo
            if (isEditMode) {
                document.getElementById('edit-btn').click(); // Simular clic en botón de edición
            }
            
            // Recrear el control de dibujo con todas las herramientas
            resetDrawControl();
            
            // Modificar el control para enfocarse en el tipo de dibujo específico
            map.removeControl(drawControl);
            drawControl = new L.Control.Draw({
                draw: {
                    polygon: drawType === 'polygon',
                    polyline: drawType === 'polyline',
                    circle: false,
                    rectangle: false,
                    circlemarker: drawType === 'circlemarker',
                    marker: false
                },
                edit: {
                    featureGroup: drawnItems
                }
            });
            map.addControl(drawControl);
        });
    }

    // Configurar botones de dibujo
    setupDrawButton('area-btn', 'polygon');
    setupDrawButton('distance-btn', 'polyline');
    setupDrawButton('coordinates-btn', 'circlemarker');

    // Función para obtener el texto de medición según el tipo de capa
    function getMeasurementText(layer) {
        if (layer instanceof L.Polygon) {
            const polygonCoords = layer.getLatLngs()[0];
            const turfCoords = polygonCoords.map(coord => [coord.lng, coord.lat]);
            turfCoords.push(turfCoords[0]);
            
            const polygonFeature = turf.polygon([turfCoords]);
            const polygonArea = turf.area(polygonFeature);
            
            // Adjust area units based on size
            if (polygonArea < 10000) {
                return `Área: ${polygonArea.toFixed(2)} m²`;
            } else if (polygonArea < 1000000) {
                const hectares = (polygonArea / 10000).toFixed(2);
                return `Área: ${hectares} Ha`;
            } else {
                const squareKilometers = (polygonArea / 1000000).toFixed(2);
                return `Área: ${squareKilometers} km²`;
            }
        }
        
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            const lineCoords = layer.getLatLngs();
            const lineFeature = turf.lineString(lineCoords.map(coord => [coord.lng, coord.lat]));
            const lineDistance = turf.length(lineFeature, {units: 'kilometers'}) * 1000;
            return `Distancia: ${lineDistance < 1000 
                ? `${lineDistance.toFixed(2)} m` 
                : `${(lineDistance / 1000).toFixed(2)} km`}`;
        }
        
        if (layer instanceof L.CircleMarker) {
            const coords = layer.getLatLng();
            return `Coordenadas: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        }
        
        return '';
    }

    // Evento para actualizar popups después de editar
    map.on('draw:edited', (e) => {
        const layers = e.layers;
        layers.eachLayer((layer) => {
            const measurementText = getMeasurementText(layer);
            if (measurementText) {
                layer.bindPopup(measurementText).openPopup();
            }
        });
    });

    // Agregar popups con mediciones al hacer clic en una capa existente
    drawnItems.on('click', (e) => {
        const layer = e.layer;
        const measurementText = getMeasurementText(layer);
        if (measurementText) {
            layer.bindPopup(measurementText).openPopup();
        }
    });

    // Manejar eventos de dibujo
    map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.addLayer(layer);

        let resultText = getMeasurementText(layer);
        
        if (resultText) {
            layer.bindPopup(resultText).openPopup();
        }
        
        // Restaurar todas las herramientas de dibujo después de crear una entidad
        resetDrawControl();
    });

    // Búsqueda de ubicaciones
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            // Usar OpenStreetMap Nominatim para geocodificación
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const firstResult = data[0];
                        const lat = parseFloat(firstResult.lat);
                        const lon = parseFloat(firstResult.lon);

                        // Centrar el mapa en la ubicación encontrada
                        map.setView([lat, lon], 13);

                        // Añadir un marcador en la ubicación
                        L.marker([lat, lon])
                            .addTo(map)
                            .bindPopup(query)
                            .openPopup();
                    } else {
                        alert('Ubicación no encontrada');
                    }
                })
                .catch(error => {
                    console.error('Error en la búsqueda:', error);
                    alert('Error al buscar la ubicación');
                });
        }
    });

    // Permitir búsqueda al presionar Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // Export Coordinates Modal Functionality
    const exportBtn = document.getElementById('export-btn');
    const exportModal = document.getElementById('export-modal');
    const closeBtn = document.querySelector('.close-btn');
    const exportTableBody = document.getElementById('export-table-body');
    const copyBtn = document.getElementById('copy-btn');
    const csvBtn = document.getElementById('csv-btn');
    const kmlBtn = document.getElementById('kml-btn');

    // Function to get layer type
    function getLayerType(layer) {
        if (layer instanceof L.Polygon) return 'Polígono';
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) return 'Línea';
        if (layer instanceof L.CircleMarker) return 'Punto';
        return 'Desconocido';
    }

    // NUEVO: Función para convertir coordenadas geográficas a UTM
    function convertToUTM(lat, lon) {
        const zone = Math.floor((lon + 180) / 6) + 1;
        const isSouth = lat < 0 ? ' +south' : '';
        const utmProj = `+proj=utm +zone=${zone}${isSouth} +datum=WGS84 +units=m +no_defs`;

        const utmCoords = proj4('WGS84', utmProj, [lon, lat]);
        return {
            utmX: utmCoords[0].toFixed(2), // Redondear a 2 decimales
            utmY: utmCoords[1].toFixed(2),
            utmZone: `${zone}${isSouth.trim() === ' +south' ? 'S' : 'N'}`
        };
    }

    // Updated function to get elevation with improved error handling and fallback
    async function getElevation(lat, lng) {
        const apis = [
            `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`,
            `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify?geometryType=esriGeometryPoint&geometry=${lng},${lat}&returnGeometry=false&returnZ=true&f=json`
        ];

        for (const apiUrl of apis) {
            try {
                const response = await fetch(apiUrl, {
                    // NUEVO: Añadir timeout para evitar bloqueos largos
                    signal: AbortSignal.timeout(5000) // 5 segundos de timeout
                });
                
                if (!response.ok) {
                    console.warn(`API request failed: ${apiUrl} (Status: ${response.status})`);
                    continue;
                }
                
                const data = await response.json();
                
                // Handle Open Elevation API response
                if (data.results && data.results.length > 0 && data.results[0].elevation !== undefined) {
                    const elevation = data.results[0].elevation;
                    if (elevation === null || isNaN(elevation)) {
                        console.warn(`NoData o valor inválido para elevación en ${lat},${lng}`);
                        return 0; // Valor predeterminado si no hay datos
                    }
                    return elevation;
                }
                
                // Handle USGS National Map API response
                if (data.value !== undefined) {
                    const elevation = data.value;
                    if (elevation === null || isNaN(elevation)) {
                        console.warn(`NoData o valor inválido para elevación en ${lat},${lng}`);
                        return 0; // Valor predeterminado si no hay datos
                    }
                    return elevation;
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`Timeout fetching elevation from ${apiUrl}`);
                } else {
                    console.warn(`Error fetching elevation from ${apiUrl}:`, error);
                }
            }
        }
        
        // NUEVO: Mejor manejo de errores con log detallado
        console.error(`No se pudo obtener elevación para ${lat},${lng} después de intentar todas las APIs`);
        return 0; // Retornar 0 como valor predeterminado si falla todo
    }

    // Function to generate coordinate data with elevation and UTM
    async function generateCoordinateData() {
        const coordinateData = [];
        let polygonCounter = 1;
        let polylineCounter = 1;
        let pointCounter = 1;

        drawnItems.eachLayer((layer) => {
            const type = getLayerType(layer);
            
            try {
                if (type === 'Polígono') {
                    const coords = layer.getLatLngs()[0];
                    coords.forEach((point, pointIndex) => {
                        coordinateData.push({
                            entityNumber: polygonCounter,
                            type: type,
                            vertices: pointIndex + 1,
                            lat: point.lat.toFixed(6),
                            lng: point.lng.toFixed(6),
                            elevationPromise: getElevation(point.lat, point.lng)
                            // NUEVO: Agregar coordenadas UTM
                        });
                    });
                    polygonCounter++;
                } else if (type === 'Línea') {
                    const coords = layer.getLatLngs();
                    coords.forEach((point, pointIndex) => {
                        coordinateData.push({
                            entityNumber: polylineCounter,
                            type: type,
                            vertices: pointIndex + 1,
                            lat: point.lat.toFixed(6),
                            lng: point.lng.toFixed(6),
                            elevationPromise: getElevation(point.lat, point.lng)
                            // NUEVO: Agregar coordenadas UTM
                        });
                    });
                    polylineCounter++;
                } else if (type === 'Punto') {
                    const point = layer.getLatLng();
                    coordinateData.push({
                        entityNumber: pointCounter,
                        type: type,
                        vertices: 1,
                        lat: point.lat.toFixed(6),
                        lng: point.lng.toFixed(6),
                        elevationPromise: getElevation(point.lat, point.lng)
                        // NUEVO: Agregar coordenadas UTM
                    });
                    pointCounter++;
                }
            } catch (error) {
                console.error(`Error processing layer of type ${type}:`, error);
            }
        });

        // Resolve elevation promises and add UTM coordinates
        const resolvedData = await Promise.all(
            coordinateData.map(async (data) => {
                const elevation = await data.elevationPromise;
                // NUEVO: Convertir a UTM
                const utm = convertToUTM(parseFloat(data.lat), parseFloat(data.lng));
                return {
                    ...data,
                    elevation: elevation,
                    utmX: utm.utmX,
                    utmY: utm.utmY,
                    utmZone: utm.utmZone,
                    elevationPromise: undefined // Limpiar la promesa resuelta
                };
            })
        );

        return resolvedData;
    }

    // Function to populate export modal
    async function populateExportModal() {
        const coordinateData = await generateCoordinateData();
        
        // Clear existing table rows
        exportTableBody.innerHTML = '';
        
        // Populate table with coordinate data
        coordinateData.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.entityNumber}</td>
                <td>${data.type}</td>
                <td>${data.vertices}</td>
                <td>${data.lat}</td>
                <td>${data.lng}</td>
                <td>${data.elevation}</td>
                <!-- NUEVO: Agregar columnas UTM con (m) -->
                <td>${data.utmX}</td>
                <td>${data.utmY}</td>
                <td>${data.utmZone}</td>
            `;
            exportTableBody.appendChild(row);
        });
    }

    // Function to generate KML content
    function generateKML(coordinateData) {
        const kmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
        const kmlFooter = '</Document>\n</kml>';
        
        let placemarks = '';
        let currentFeature = null;
        let currentCoordinates = [];

        coordinateData.forEach((data, index) => {
            // If this is a new feature type or the first item
            if (!currentFeature || currentFeature !== data.type) {
                // Close previous placemark if it exists
                if (currentFeature) {
                    if (currentFeature === 'Polígono') {
                        placemarks += `
            <Placemark>
                <name>Polygon</name>
                <Polygon>
                    <outerBoundaryIs>
                        <LinearRing>
                            <coordinates>${currentCoordinates.join(' ')}</coordinates>
                        </LinearRing>
                    </outerBoundaryIs>
                </Polygon>
            </Placemark>`;
                    } else if (currentFeature === 'Línea') {
                        placemarks += `
            <Placemark>
                <name>Polyline</name>
                <LineString>
                    <coordinates>${currentCoordinates.join(' ')}</coordinates>
                </LineString>
            </Placemark>`;
                    }
                    
                    // Reset for new feature
                    currentCoordinates = [];
                }

                // Start new feature
                currentFeature = data.type;
            }

            // Add coordinate
            currentCoordinates.push(`${data.lng},${data.lat},${data.elevation}`);

            // For Point, create a separate placemark
            if (data.type === 'Punto') {
                placemarks += `
            <Placemark>
                <name>Point ${data.vertices}</name>
                <Point>
                    <coordinates>${data.lng},${data.lat},${data.elevation}</coordinates>
                </Point>
            </Placemark>`;
            }
        });

        // Handle the last feature
        if (currentFeature === 'Polígono') {
            placemarks += `
            <Placemark>
                <name>Polygon</name>
                <Polygon>
                    <outerBoundaryIs>
                        <LinearRing>
                            <coordinates>${currentCoordinates.join(' ')}</coordinates>
                        </LinearRing>
                    </outerBoundaryIs>
                </Polygon>
            </Placemark>`;
        } else if (currentFeature === 'Línea') {
            placemarks += `
            <Placemark>
                <name>Polyline</name>
                <LineString>
                    <coordinates>${currentCoordinates.join(' ')}</coordinates>
                </LineString>
            </Placemark>`;
        }

        return kmlHeader + placemarks + kmlFooter;
    }

    // Function to generate GeoJSON
    function generateGeoJSON(coordinateData) {
        const features = [];
        let currentFeature = null;
        let currentCoordinates = [];
        let featureType = null;

        coordinateData.forEach((data, index) => {
            // If this is a new feature type or the first item
            if (!currentFeature || currentFeature !== data.type) {
                // Close previous feature if it exists
                if (currentFeature) {
                    const featureObj = {
                        type: 'Feature',
                        geometry: {
                            type: featureType === 'Polígono' ? 'Polygon' : 
                                  featureType === 'Línea' ? 'LineString' : 
                                  'Point',
                            coordinates: featureType === 'Polígono' ? [currentCoordinates] : currentCoordinates
                        },
                        properties: {
                            name: `${currentFeature} ${features.length + 1}`,
                            // NUEVO: Agregar propiedades UTM
                            utmX: currentCoordinates[0] ? convertToUTM(currentCoordinates[0][1], currentCoordinates[0][0]).utmX : '',
                            utmY: currentCoordinates[0] ? convertToUTM(currentCoordinates[0][1], currentCoordinates[0][0]).utmY : '',
                            utmZone: currentCoordinates[0] ? convertToUTM(currentCoordinates[0][1], currentCoordinates[0][0]).utmZone : ''
                        }
                    };
                    features.push(featureObj);
                    
                    // Reset for new feature
                    currentCoordinates = [];
                }

                // Start new feature
                currentFeature = data.type;
                featureType = data.type;
            }

            // Add coordinate based on type
            if (data.type === 'Punto') {
                currentCoordinates = [parseFloat(data.lng), parseFloat(data.lat)];
                
                const featureObj = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: currentCoordinates
                    },
                    properties: {
                        name: `${currentFeature} ${features.length + 1}`,
                        // NUEVO: Agregar propiedades UTM
                        utmX: data.utmX,
                        utmY: data.utmY,
                        utmZone: data.utmZone
                    }
                };
                features.push(featureObj);
            } else {
                // For polylines and polygons, add coordinates in [lon, lat] order
                currentCoordinates.push([parseFloat(data.lng), parseFloat(data.lat)]);
            }
        });

        // Handle the last feature if it's a polyline or polygon
        if (currentFeature === 'Polígono' || currentFeature === 'Línea') {
            const featureObj = {
                type: 'Feature',
                geometry: {
                    type: currentFeature === 'Polígono' ? 'Polygon' : 'LineString',
                    coordinates: currentFeature === 'Polígono' ? [currentCoordinates] : currentCoordinates
                },
                properties: {
                    name: `${currentFeature} ${features.length + 1}`,
                    // NUEVO: Agregar propiedades UTM
                    utmX: currentCoordinates[0] ? convertToUTM(currentCoordinates[0][1], currentCoordinates[0][0]).utmX : '',
                    utmY: currentCoordinates[0] ? convertToUTM(currentCoordinates[0][1], currentCoordinates[0][0]).utmY : '',
                    utmZone: currentCoordinates[0] ? convertToUTM(currentCoordinates[0][1], currentCoordinates[0][0]).utmZone : ''
                }
            };
            features.push(featureObj);
        }

        return {
            type: 'FeatureCollection',
            features: features
        };
    }

    // Show export modal
    exportBtn.addEventListener('click', async () => {
        // Only show modal if there are drawn items
        if (drawnItems.getLayers().length > 0) {
            await populateExportModal();
            exportModal.style.display = 'block';
        } else {
            alert('No hay elementos para exportar');
        }
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        exportModal.style.display = 'none';
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', async () => {
        const coordinateData = await generateCoordinateData();
        const clipboardText = coordinateData.map(data => 
            `${data.type}\t${data.vertices}\t${data.lat}\t${data.lng}\t${data.elevation}\t${data.utmX}\t${data.utmY}\t${data.utmZone}`
        ).join('\n');
        
        navigator.clipboard.writeText(clipboardText).then(() => {
            alert('Coordenadas copiadas al portapapeles');
        }).catch(err => {
            console.error('Error copying text: ', err);
        });
    });

    csvBtn.addEventListener('click', async () => {
        const coordinateData = await generateCoordinateData();
        const csvContent = [
            'Tipo,Vértices,Latitud,Longitud,Elevación,UTMX (m),UTMY (m),Zona UTM',
            ...coordinateData.map(data => 
                `${data.type},${data.vertices},${data.lat},${data.lng},${data.elevation},${data.utmX},${data.utmY},${data.utmZone}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'coordenadas_exportadas.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Export to KML
    kmlBtn.addEventListener('click', async () => {
        const coordinateData = await generateCoordinateData();
        const kmlContent = generateKML(coordinateData);

        const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'coordenadas_exportadas.kml');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // NUEVO: Añadir botón de Descargar GeoJSON
    const geojsonBtn = document.createElement('button');
    geojsonBtn.id = 'geojson-btn';
    geojsonBtn.textContent = 'Descargar GeoJSON'; // NUEVO: Cambiar a "Descargar"
    document.querySelector('.modal-buttons').appendChild(geojsonBtn);

    // Add event listener for GeoJSON export
    geojsonBtn.addEventListener('click', async () => {
        const coordinateData = await generateCoordinateData();
        const geoJSONContent = generateGeoJSON(coordinateData);

        const blob = new Blob([JSON.stringify(geoJSONContent, null, 2)], { type: 'application/geo+json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'coordenadas_exportadas.geojson');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // NUEVO: Añadir botón de Descargar XLS
    const xlsBtn = document.createElement('button');
    xlsBtn.id = 'xls-btn';
    xlsBtn.textContent = 'Descargar XLS'; // NUEVO: Cambiar a "Descargar"
    document.querySelector('.modal-buttons').appendChild(xlsBtn);

    // Add event listener for XLS export
    xlsBtn.addEventListener('click', async () => {
        const coordinateData = await generateCoordinateData();
        
        // Prepare data for Excel export
        const worksheet = XLSX.utils.json_to_sheet(coordinateData.map(data => ({
            'Tipo': data.type,
            'Vértices': data.vertices,
            'Latitud': data.lat,
            'Longitud': data.lng,
            'Elevación': data.elevation,
            // NUEVO: Agregar columnas UTM con (m)
            'UTMX (m)': data.utmX,
            'UTMY (m)': data.utmY,
            'Zona UTM': data.utmZone
        })));

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Coordenadas');

        // Export file
        XLSX.writeFile(workbook, 'coordenadas_exportadas.xlsx');
    });

    // Close modal if clicked outside
    window.addEventListener('click', (event) => {
        if (event.target === exportModal) {
            exportModal.style.display = 'none';
        }
    });
});