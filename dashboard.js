// Variáveis globais
let speedtestData = [];
let filteredData = [];
let charts = {};
let currentSort = { column: null, direction: 'asc' };
let tableData = [];

// Cores para os gráficos
const colors = {
    download: 'rgba(102, 126, 234, 0.8)',
    upload: 'rgba(118, 75, 162, 0.8)',
    ping: 'rgba(255, 99, 132, 0.8)',
    border: {
        download: 'rgba(102, 126, 234, 1)',
        upload: 'rgba(118, 75, 162, 1)',
        ping: 'rgba(255, 99, 132, 1)'
    }
};

// Funções utilitárias de estatística
function calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function calculateStdDev(arr, mean) {
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
}

function calculateQuartiles(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    return {
        q1: sorted[q1Index],
        q3: sorted[q3Index],
        median: calculateMedian(sorted),
        min: sorted[0],
        max: sorted[sorted.length - 1]
    };
}

// Mostrar mensagem de carregamento
function showLoading() {
    document.getElementById('total-tests').textContent = 'Carregando dados...';
    document.getElementById('date-range').textContent = 'Aguarde...';
}

// Processar dados carregados
function processData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Dados inválidos ou vazios');
    }
    
    // Esconder indicador de carregamento
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Ordenar por data (mais recente primeiro)
    speedtestData = data.sort((a, b) => new Date(b.created) - new Date(a.created));
    filteredData = [...speedtestData];
    
    // Popular filtro de servidores
    populateServerFilter();
    
    updateDashboard();
}

// Popular filtro de servidores
function populateServerFilter() {
    const servers = [...new Set(speedtestData.map(d => d.serverId))].sort();
    const select = document.getElementById('server-filter');
    select.innerHTML = '<option value="all">Todos os servidores</option>';
    servers.forEach(serverId => {
        const option = document.createElement('option');
        option.value = serverId;
        option.textContent = `Servidor ${serverId}`;
        select.appendChild(option);
    });
}

// Carregar dados do JSON
async function loadData() {
    showLoading();
    
    try {
        const response = await fetch('speedtests.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        processData(data);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        document.getElementById('total-tests').textContent = 'Erro ao carregar dados';
        document.getElementById('date-range').innerHTML = 
            '<span style="color: red;">Erro: ' + error.message + '</span><br>' +
            '<small>Use um servidor local ou carregue o arquivo manualmente</small>';
        
        showFileInput();
    }
}

// Mostrar input para carregar arquivo manualmente
function showFileInput() {
    const headerInfo = document.querySelector('.header-info');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.marginTop = '10px';
    fileInput.style.padding = '10px';
    fileInput.style.borderRadius = '8px';
    fileInput.style.border = '2px solid #667eea';
    fileInput.style.cursor = 'pointer';
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    processData(data);
                    fileInput.remove();
                } catch (error) {
                    alert('Erro ao processar arquivo JSON: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    });
    
    headerInfo.appendChild(fileInput);
}

// Calcular estatísticas básicas
function calculateStats(data) {
    if (data.length === 0) return null;

    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);
    const times = data.map(d => d.time);

    const downloadMean = downloads.reduce((a, b) => a + b, 0) / downloads.length;
    const uploadMean = uploads.reduce((a, b) => a + b, 0) / uploads.length;
    const pingMean = pings.reduce((a, b) => a + b, 0) / pings.length;

    return {
        download: {
            avg: downloadMean.toFixed(2),
            max: Math.max(...downloads).toFixed(2),
            min: Math.min(...downloads).toFixed(2),
            median: calculateMedian(downloads).toFixed(2),
            std: calculateStdDev(downloads, downloadMean).toFixed(2),
            ...calculateQuartiles(downloads)
        },
        upload: {
            avg: uploadMean.toFixed(2),
            max: Math.max(...uploads).toFixed(2),
            min: Math.min(...uploads).toFixed(2),
            median: calculateMedian(uploads).toFixed(2),
            std: calculateStdDev(uploads, uploadMean).toFixed(2),
            ...calculateQuartiles(uploads)
        },
        ping: {
            avg: pingMean.toFixed(2),
            max: Math.max(...pings).toFixed(2),
            min: Math.min(...pings).toFixed(2),
            median: calculateMedian(pings).toFixed(2),
            std: calculateStdDev(pings, pingMean).toFixed(2),
            ...calculateQuartiles(pings)
        },
        time: {
            avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
            max: Math.max(...times).toFixed(2),
            total: times.reduce((a, b) => a + b, 0)
        }
    };
}

// Calcular qualidade da conexão
function calculateQuality(data) {
    if (data.length === 0) return null;

    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);

    const downloadMean = downloads.reduce((a, b) => a + b, 0) / downloads.length;
    const uploadMean = uploads.reduce((a, b) => a + b, 0) / uploads.length;
    const pingMean = pings.reduce((a, b) => a + b, 0) / pings.length;

    // Score baseado em múltiplos fatores
    const downloadScore = Math.min(100, (downloadMean / 500) * 100);
    const uploadScore = Math.min(100, (uploadMean / 500) * 100);
    const pingScore = Math.max(0, 100 - (pingMean - 1) * 10);
    
    const overallScore = ((downloadScore + uploadScore + pingScore) / 3).toFixed(1);

    // Estabilidade (baseada no desvio padrão)
    const downloadStd = calculateStdDev(downloads, downloadMean);
    const uploadStd = calculateStdDev(uploads, uploadMean);
    const stability = Math.max(0, 100 - ((downloadStd / downloadMean) + (uploadStd / uploadMean)) * 50).toFixed(1);

    // Testes consistentes (dentro de 20% da média)
    const consistentDownload = downloads.filter(d => Math.abs(d - downloadMean) / downloadMean <= 0.2).length;
    const consistentUpload = uploads.filter(u => Math.abs(u - uploadMean) / uploadMean <= 0.2).length;
    const consistentTests = Math.round((consistentDownload + consistentUpload) / 2);

    return {
        score: overallScore,
        stability: stability,
        consistentTests: consistentTests,
        successRate: '100%'
    };
}

// Atualizar estatísticas na interface
function updateStats(data) {
    const stats = calculateStats(data);
    if (!stats) return;

    // Estatísticas básicas
    document.getElementById('download-avg').textContent = `${stats.download.avg} Mbps`;
    document.getElementById('download-max').textContent = `${stats.download.max} Mbps`;
    document.getElementById('download-min').textContent = `${stats.download.min} Mbps`;
    document.getElementById('download-median').textContent = `${stats.download.median} Mbps`;

    document.getElementById('upload-avg').textContent = `${stats.upload.avg} Mbps`;
    document.getElementById('upload-max').textContent = `${stats.upload.max} Mbps`;
    document.getElementById('upload-min').textContent = `${stats.upload.min} Mbps`;
    document.getElementById('upload-median').textContent = `${stats.upload.median} Mbps`;

    document.getElementById('ping-avg').textContent = `${stats.ping.avg} ms`;
    document.getElementById('ping-max').textContent = `${stats.ping.max} ms`;
    document.getElementById('ping-min').textContent = `${stats.ping.min} ms`;
    document.getElementById('ping-median').textContent = `${stats.ping.median} ms`;

    document.getElementById('time-avg').textContent = `${stats.time.avg} s`;
    document.getElementById('time-max').textContent = `${stats.time.max} s`;
    document.getElementById('total-time').textContent = `${Math.round(stats.time.total / 60)} min`;

    // Estatísticas avançadas
    document.getElementById('download-std').textContent = `${stats.download.std} Mbps`;
    document.getElementById('download-q1').textContent = `${stats.download.q1.toFixed(2)} Mbps`;
    document.getElementById('download-q3').textContent = `${stats.download.q3.toFixed(2)} Mbps`;
    document.getElementById('download-iqr').textContent = `${(stats.download.q3 - stats.download.q1).toFixed(2)} Mbps`;

    document.getElementById('upload-std').textContent = `${stats.upload.std} Mbps`;
    document.getElementById('upload-q1').textContent = `${stats.upload.q1.toFixed(2)} Mbps`;
    document.getElementById('upload-q3').textContent = `${stats.upload.q3.toFixed(2)} Mbps`;
    document.getElementById('upload-iqr').textContent = `${(stats.upload.q3 - stats.upload.q1).toFixed(2)} Mbps`;

    document.getElementById('ping-std').textContent = `${stats.ping.std} ms`;
    document.getElementById('ping-q1').textContent = `${stats.ping.q1.toFixed(2)} ms`;
    document.getElementById('ping-q3').textContent = `${stats.ping.q3.toFixed(2)} ms`;
    document.getElementById('ping-iqr').textContent = `${(stats.ping.q3 - stats.ping.q1).toFixed(2)} ms`;

    // Qualidade
    const quality = calculateQuality(data);
    if (quality) {
        document.getElementById('quality-score').textContent = `${quality.score}/100`;
        document.getElementById('stability').textContent = `${quality.stability}%`;
        document.getElementById('consistent-tests').textContent = `${quality.consistentTests} de ${data.length}`;
        document.getElementById('success-rate').textContent = quality.successRate;
    }
}

// Atualizar informações do cabeçalho
function updateHeaderInfo(data) {
    document.getElementById('total-tests').textContent = `${data.length} testes realizados`;
    
    if (data.length > 0) {
        const firstDate = new Date(data[data.length - 1].created);
        const lastDate = new Date(data[0].created);
        const formatDate = (date) => date.toLocaleDateString('pt-BR');
        document.getElementById('date-range').textContent = 
            `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
    }
}

// Filtrar dados
function applyFilters() {
    filteredData = [...speedtestData];

    // Filtro de período
    const period = document.getElementById('period-filter').value;
    if (period !== 'all') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(period));
        filteredData = filteredData.filter(item => {
            const itemDate = new Date(item.created);
            return itemDate >= cutoffDate;
        });
    }

    // Filtro de servidor
    const server = document.getElementById('server-filter').value;
    if (server !== 'all') {
        filteredData = filteredData.filter(item => item.serverId == server);
    }

    // Filtro de velocidade mínima download
    const minDownload = document.getElementById('min-download').value;
    if (minDownload) {
        filteredData = filteredData.filter(item => item.download >= parseFloat(minDownload));
    }

    // Filtro de velocidade mínima upload
    const minUpload = document.getElementById('min-upload').value;
    if (minUpload) {
        filteredData = filteredData.filter(item => item.upload >= parseFloat(minUpload));
    }
}

// Reduzir pontos de dados
function reduceDataPoints(data, maxPoints) {
    if (data.length <= maxPoints || maxPoints === 'all') {
        return data;
    }

    const step = Math.ceil(data.length / maxPoints);
    const reduced = [];
    
    for (let i = 0; i < data.length; i += step) {
        reduced.push(data[i]);
    }
    
    return reduced;
}

// Criar gráfico de linha
function createLineChart(canvasId, label, data, color, borderColor, dataKey) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const maxPoints = document.getElementById('data-points').value;
    const reducedData = reduceDataPoints(data, maxPoints === 'all' ? 'all' : parseInt(maxPoints));

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: reducedData.map(d => {
                const date = new Date(d.created);
                return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [{
                label: label,
                data: reducedData.map(d => d[dataKey]),
                borderColor: borderColor,
                backgroundColor: color,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Criar gráfico de distribuição
function createDistributionChart(data) {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    if (charts.distributionChart) {
        charts.distributionChart.destroy();
    }

    const downloadBuckets = {};
    const uploadBuckets = {};
    
    data.forEach(item => {
        const downloadBucket = Math.floor(item.download / 50) * 50;
        const uploadBucket = Math.floor(item.upload / 50) * 50;
        
        downloadBuckets[downloadBucket] = (downloadBuckets[downloadBucket] || 0) + 1;
        uploadBuckets[uploadBucket] = (uploadBuckets[uploadBucket] || 0) + 1;
    });

    const downloadLabels = Object.keys(downloadBuckets).sort((a, b) => a - b).map(k => `${k}-${parseInt(k) + 50} Mbps`);

    charts.distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: downloadLabels,
            datasets: [
                {
                    label: 'Download',
                    data: Object.keys(downloadBuckets).sort((a, b) => a - b).map(k => downloadBuckets[k]),
                    backgroundColor: colors.download,
                    borderColor: colors.border.download,
                    borderWidth: 1
                },
                {
                    label: 'Upload',
                    data: Object.keys(uploadBuckets).sort((a, b) => a - b).map(k => uploadBuckets[k]),
                    backgroundColor: colors.upload,
                    borderColor: colors.border.upload,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar box plot (usando gráfico de barras com múltiplos datasets)
function createBoxPlot(canvasId, data, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const values = data.map(d => d[label.toLowerCase()]);
    const quartiles = calculateQuartiles(values);
    const iqr = quartiles.q3 - quartiles.q1;
    const lowerWhisker = Math.max(quartiles.min, quartiles.q1 - 1.5 * iqr);
    const upperWhisker = Math.min(quartiles.max, quartiles.q3 + 1.5 * iqr);

    // Criar visualização de box plot usando barras
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Min', 'Q1', 'Mediana', 'Q3', 'Max', 'IQR'],
            datasets: [{
                label: label,
                data: [
                    lowerWhisker,
                    quartiles.q1,
                    quartiles.median,
                    quartiles.q3,
                    upperWhisker,
                    iqr
                ],
                backgroundColor: [
                    'rgba(200, 200, 200, 0.5)',
                    color,
                    colors.border[label.toLowerCase()],
                    color,
                    'rgba(200, 200, 200, 0.5)',
                    'rgba(150, 150, 150, 0.3)'
                ],
                borderColor: colors.border[label.toLowerCase()],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: label === 'Download' || label === 'Upload' ? 'Mbps' : 'ms'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar histograma detalhado
function createHistogram(canvasId, data, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const values = data.map(d => d[label.toLowerCase()]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / 20;
    const buckets = {};
    
    values.forEach(val => {
        const bucket = Math.floor((val - min) / bucketSize) * bucketSize + min;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
    });

    const labels = Object.keys(buckets).sort((a, b) => a - b).map(k => parseFloat(k).toFixed(0));
    const bucketData = Object.keys(buckets).sort((a, b) => a - b).map(k => buckets[k]);

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: bucketData,
                backgroundColor: color,
                borderColor: colors.border[label.toLowerCase()],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico por hora do dia
function createHourlyChart(data) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    if (charts.hourlyChart) {
        charts.hourlyChart.destroy();
    }

    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
        hourlyData[i] = { download: [], upload: [] };
    }

    data.forEach(item => {
        const hour = new Date(item.created).getHours();
        hourlyData[hour].download.push(item.download);
        hourlyData[hour].upload.push(item.upload);
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const avgDownload = hours.map(h => {
        const downloads = hourlyData[h].download;
        return downloads.length > 0 ? downloads.reduce((a, b) => a + b, 0) / downloads.length : 0;
    });
    const avgUpload = hours.map(h => {
        const uploads = hourlyData[h].upload;
        return uploads.length > 0 ? uploads.reduce((a, b) => a + b, 0) / uploads.length : 0;
    });

    charts.hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours.map(h => `${h}h`),
            datasets: [
                {
                    label: 'Download',
                    data: avgDownload,
                    backgroundColor: colors.download,
                    borderColor: colors.border.download,
                    borderWidth: 1
                },
                {
                    label: 'Upload',
                    data: avgUpload,
                    backgroundColor: colors.upload,
                    borderColor: colors.border.upload,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico por dia da semana
function createWeekdayChart(data) {
    const ctx = document.getElementById('weekdayChart').getContext('2d');
    
    if (charts.weekdayChart) {
        charts.weekdayChart.destroy();
    }

    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayData = {};
    for (let i = 0; i < 7; i++) {
        weekdayData[i] = { download: [], upload: [] };
    }

    data.forEach(item => {
        const weekday = new Date(item.created).getDay();
        weekdayData[weekday].download.push(item.download);
        weekdayData[weekday].upload.push(item.upload);
    });

    const weekdays = Array.from({ length: 7 }, (_, i) => i);
    const avgDownload = weekdays.map(w => {
        const downloads = weekdayData[w].download;
        return downloads.length > 0 ? downloads.reduce((a, b) => a + b, 0) / downloads.length : 0;
    });
    const avgUpload = weekdays.map(w => {
        const uploads = weekdayData[w].upload;
        return uploads.length > 0 ? uploads.reduce((a, b) => a + b, 0) / uploads.length : 0;
    });

    charts.weekdayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekdays.map(w => weekdayNames[w]),
            datasets: [
                {
                    label: 'Download',
                    data: avgDownload,
                    backgroundColor: colors.download,
                    borderColor: colors.border.download,
                    borderWidth: 1
                },
                {
                    label: 'Upload',
                    data: avgUpload,
                    backgroundColor: colors.upload,
                    borderColor: colors.border.upload,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico por mês
function createMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    if (charts.monthlyChart) {
        charts.monthlyChart.destroy();
    }

    const monthlyData = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    data.forEach(item => {
        const date = new Date(item.created);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { download: [], upload: [], label: `${monthNames[date.getMonth()]}/${date.getFullYear()}` };
        }
        monthlyData[monthKey].download.push(item.download);
        monthlyData[monthKey].upload.push(item.upload);
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const avgDownload = sortedMonths.map(m => {
        const downloads = monthlyData[m].download;
        return downloads.reduce((a, b) => a + b, 0) / downloads.length;
    });
    const avgUpload = sortedMonths.map(m => {
        const uploads = monthlyData[m].upload;
        return uploads.reduce((a, b) => a + b, 0) / uploads.length;
    });

    charts.monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedMonths.map(m => monthlyData[m].label),
            datasets: [
                {
                    label: 'Download',
                    data: avgDownload,
                    backgroundColor: colors.download,
                    borderColor: colors.border.download,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Upload',
                    data: avgUpload,
                    backgroundColor: colors.upload,
                    borderColor: colors.border.upload,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico de correlação
function createCorrelationChart(data) {
    const ctx = document.getElementById('correlationChart').getContext('2d');
    
    if (charts.correlationChart) {
        charts.correlationChart.destroy();
    }

    const reducedData = reduceDataPoints(data, 500);
    const scatterData = reducedData.map(d => ({ x: d.download, y: d.upload }));

    charts.correlationChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Download vs Upload',
                data: scatterData,
                backgroundColor: colors.download,
                borderColor: colors.border.download,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Download (Mbps)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Upload (Mbps)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Criar gráfico de tendência (média móvel)
function createTrendChart(canvasId, data, label, color, dataKey, windowSize = 10) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const movingAverage = [];
    
    for (let i = 0; i < sortedData.length; i++) {
        const start = Math.max(0, i - windowSize);
        const window = sortedData.slice(start, i + 1);
        const avg = window.reduce((sum, d) => sum + d[dataKey], 0) / window.length;
        movingAverage.push(avg);
    }

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedData.map(d => {
                const date = new Date(d.created);
                return date.toLocaleDateString('pt-BR');
            }),
            datasets: [{
                label: label,
                data: movingAverage,
                borderColor: color,
                backgroundColor: color.replace('0.8', '0.2'),
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico Ping vs Velocidade
function createPingVsSpeedChart(data) {
    const ctx = document.getElementById('pingVsSpeed').getContext('2d');
    
    if (charts.pingVsSpeed) {
        charts.pingVsSpeed.destroy();
    }

    const reducedData = reduceDataPoints(data, 500);
    const scatterData = reducedData.map(d => ({ 
        x: (d.download + d.upload) / 2, 
        y: d.ping 
    }));

    charts.pingVsSpeed = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Velocidade Média vs Ping',
                data: scatterData,
                backgroundColor: colors.ping,
                borderColor: colors.border.ping,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Velocidade Média (Mbps)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Ping (ms)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Atualizar todos os gráficos
function updateCharts(data) {
    const maxPoints = document.getElementById('data-points').value;
    const reducedData = reduceDataPoints(data, maxPoints === 'all' ? 'all' : parseInt(maxPoints));

    // Gráficos principais
    createLineChart('downloadChart', 'Download', reducedData, colors.download, colors.border.download, 'download');
    createLineChart('uploadChart', 'Upload', reducedData, colors.upload, colors.border.upload, 'upload');
    createLineChart('pingChart', 'Ping', reducedData, colors.ping, colors.border.ping, 'ping');
    
    // Gráficos de distribuição
    createDistributionChart(data);
    
    // Box plots
    createBoxPlot('boxPlotDownload', data, 'Download', colors.download);
    createBoxPlot('boxPlotUpload', data, 'Upload', colors.upload);
    createBoxPlot('boxPlotPing', data, 'Ping', colors.ping);
    
    // Histogramas detalhados
    createHistogram('histogramDownload', data, 'Download', colors.download);
    createHistogram('histogramUpload', data, 'Upload', colors.upload);
    
    // Análises temporais
    createHourlyChart(data);
    createWeekdayChart(data);
    createMonthlyChart(data);
    
    // Correlações e tendências
    createCorrelationChart(data);
    createTrendChart('trendDownload', data, 'Download', colors.download, 'download');
    createTrendChart('trendUpload', data, 'Upload', colors.upload, 'upload');
    createPingVsSpeedChart(data);
}

// Atualizar tabela
function updateTable(data) {
    tableData = data;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const searchTerm = document.getElementById('table-search').value.toLowerCase();
    const maxRows = document.getElementById('table-rows').value;
    
    let filtered = tableData;
    
    // Aplicar busca
    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.id.toString().includes(searchTerm) ||
            new Date(item.created).toLocaleString('pt-BR').toLowerCase().includes(searchTerm) ||
            item.download.toString().includes(searchTerm) ||
            item.upload.toString().includes(searchTerm) ||
            item.ping.toString().includes(searchTerm) ||
            item.serverId.toString().includes(searchTerm)
        );
    }
    
    // Limitar linhas
    if (maxRows !== 'all') {
        filtered = filtered.slice(0, parseInt(maxRows));
    }
    
    tbody.innerHTML = filtered.map(item => {
        const date = new Date(item.created);
        return `
            <tr>
                <td>${item.id}</td>
                <td>${date.toLocaleString('pt-BR')}</td>
                <td>${item.download.toFixed(2)} Mbps</td>
                <td>${item.upload.toFixed(2)} Mbps</td>
                <td>${item.ping} ms</td>
                <td>${item.time} s</td>
                <td>${item.serverId}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('table-info-text').textContent = 
        `Mostrando ${filtered.length} de ${tableData.length} registros`;
}

// Ordenar tabela
function sortTable(columnIndex) {
    const columns = ['id', 'created', 'download', 'upload', 'ping', 'time', 'serverId'];
    const column = columns[columnIndex];
    
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    tableData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        if (column === 'created') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        if (currentSort.direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    renderTable();
}

// Exportar relatório
function exportReport() {
    const stats = calculateStats(filteredData);
    const quality = calculateQuality(filteredData);
    
    const report = `
RELATÓRIO DE TESTES DE VELOCIDADE
================================

Período: ${document.getElementById('date-range').textContent}
Total de Testes: ${filteredData.length}

ESTATÍSTICAS PRINCIPAIS
------------------------
Download:
  Média: ${stats.download.avg} Mbps
  Máximo: ${stats.download.max} Mbps
  Mínimo: ${stats.download.min} Mbps
  Mediana: ${stats.download.median} Mbps
  Desvio Padrão: ${stats.download.std} Mbps

Upload:
  Média: ${stats.upload.avg} Mbps
  Máximo: ${stats.upload.max} Mbps
  Mínimo: ${stats.upload.min} Mbps
  Mediana: ${stats.upload.median} Mbps
  Desvio Padrão: ${stats.upload.std} Mbps

Ping:
  Média: ${stats.ping.avg} ms
  Máximo: ${stats.ping.max} ms
  Mínimo: ${stats.ping.min} ms
  Mediana: ${stats.ping.median} ms
  Desvio Padrão: ${stats.ping.std} ms

QUALIDADE DA CONEXÃO
--------------------
Score Geral: ${quality.score}/100
Estabilidade: ${quality.stability}%
Testes Consistentes: ${quality.consistentTests} de ${filteredData.length}
Taxa de Sucesso: ${quality.successRate}

Gerado em: ${new Date().toLocaleString('pt-BR')}
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-velocidade-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Calcular percentil
function calculatePercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

// Detectar outliers usando IQR
function detectOutliers(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const q1 = calculatePercentile(sorted, 25);
    const q3 = calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return arr.filter(val => val < lowerBound || val > upperBound);
}

// Calcular skewness
function calculateSkewness(arr, mean, stdDev) {
    const n = arr.length;
    const skew = arr.reduce((sum, val) => {
        return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0) / n;
    return skew.toFixed(3);
}

// Calcular kurtosis
function calculateKurtosis(arr, mean, stdDev) {
    const n = arr.length;
    const kurt = arr.reduce((sum, val) => {
        return sum + Math.pow((val - mean) / stdDev, 4);
    }, 0) / n - 3;
    return kurt.toFixed(3);
}

// Calcular variância
function calculateVariance(arr, mean) {
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
}

// Atualizar percentis na interface
function updatePercentiles(data) {
    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);

    const percentiles = [10, 25, 50, 75, 90, 95, 99];
    
    percentiles.forEach(p => {
        document.getElementById(`download-p${p}`).textContent = `${calculatePercentile(downloads, p).toFixed(2)} Mbps`;
        document.getElementById(`upload-p${p}`).textContent = `${calculatePercentile(uploads, p).toFixed(2)} Mbps`;
        document.getElementById(`ping-p${p}`).textContent = `${calculatePercentile(pings, p).toFixed(2)} ms`;
    });
}

// Atualizar análise de outliers
function updateOutliers(data) {
    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);

    const outliersDownload = detectOutliers(downloads);
    const outliersUpload = detectOutliers(uploads);
    const outliersPing = detectOutliers(pings);
    
    const totalOutliers = outliersDownload.length + outliersUpload.length + outliersPing.length;
    const outlierRate = ((totalOutliers / (data.length * 3)) * 100).toFixed(2);

    document.getElementById('outliers-download').textContent = `${outliersDownload.length} (${((outliersDownload.length / data.length) * 100).toFixed(1)}%)`;
    document.getElementById('outliers-upload').textContent = `${outliersUpload.length} (${((outliersUpload.length / data.length) * 100).toFixed(1)}%)`;
    document.getElementById('outliers-ping').textContent = `${outliersPing.length} (${((outliersPing.length / data.length) * 100).toFixed(1)}%)`;
    document.getElementById('outliers-rate').textContent = `${outlierRate}%`;
}

// Criar heatmap
function createHeatmap(canvasId, data, dataKey, label) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const heatmapData = {};
    
    for (let h = 0; h < 24; h++) {
        for (let d = 0; d < 7; d++) {
            heatmapData[`${h}-${d}`] = [];
        }
    }

    data.forEach(item => {
        const date = new Date(item.created);
        const hour = date.getHours();
        const weekday = date.getDay();
        heatmapData[`${hour}-${weekday}`].push(item[dataKey]);
    });

    const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
    const datasets = weekdayNames.map((dayName, dayIndex) => {
        const dayData = labels.map((_, hour) => {
            const values = heatmapData[`${hour}-${dayIndex}`];
            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        });
        return {
            label: dayName,
            data: dayData,
            backgroundColor: colors[dataKey] || colors.download
        };
    });

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico comparativo
function createComparisonChart(data) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (charts.comparisonChart) {
        charts.comparisonChart.destroy();
    }

    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(mid);
    const secondHalf = data.slice(0, mid);

    const calcAvg = (arr, key) => {
        const values = arr.map(d => d[key]);
        return values.reduce((a, b) => a + b, 0) / values.length;
    };

    charts.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Primeira Metade', 'Última Metade'],
            datasets: [
                {
                    label: 'Download',
                    data: [calcAvg(firstHalf, 'download'), calcAvg(secondHalf, 'download')],
                    backgroundColor: colors.download,
                    borderColor: colors.border.download,
                    borderWidth: 1
                },
                {
                    label: 'Upload',
                    data: [calcAvg(firstHalf, 'upload'), calcAvg(secondHalf, 'upload')],
                    backgroundColor: colors.upload,
                    borderColor: colors.border.upload,
                    borderWidth: 1
                },
                {
                    label: 'Ping',
                    data: [calcAvg(firstHalf, 'ping'), calcAvg(secondHalf, 'ping')],
                    backgroundColor: colors.ping,
                    borderColor: colors.border.ping,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico de evolução percentual
function createEvolutionChart(data) {
    const ctx = document.getElementById('evolutionChart').getContext('2d');
    
    if (charts.evolutionChart) {
        charts.evolutionChart.destroy();
    }

    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const windowSize = Math.max(10, Math.floor(sortedData.length / 20));
    const evolution = [];
    
    for (let i = windowSize; i < sortedData.length; i += windowSize) {
        const window = sortedData.slice(i - windowSize, i);
        const avgDownload = window.reduce((sum, d) => sum + d.download, 0) / window.length;
        const avgUpload = window.reduce((sum, d) => sum + d.upload, 0) / window.length;
        const baselineDownload = sortedData.slice(0, windowSize).reduce((sum, d) => sum + d.download, 0) / windowSize;
        const baselineUpload = sortedData.slice(0, windowSize).reduce((sum, d) => sum + d.upload, 0) / windowSize;
        
        evolution.push({
            date: new Date(window[window.length - 1].created),
            downloadChange: ((avgDownload - baselineDownload) / baselineDownload * 100).toFixed(2),
            uploadChange: ((avgUpload - baselineUpload) / baselineUpload * 100).toFixed(2)
        });
    }

    charts.evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: evolution.map(e => e.date.toLocaleDateString('pt-BR')),
            datasets: [
                {
                    label: 'Mudança Download (%)',
                    data: evolution.map(e => parseFloat(e.downloadChange)),
                    borderColor: colors.border.download,
                    backgroundColor: colors.download,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Mudança Upload (%)',
                    data: evolution.map(e => parseFloat(e.uploadChange)),
                    borderColor: colors.border.upload,
                    backgroundColor: colors.upload,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Mudança Percentual (%)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico de comparação por período do dia
function createPeriodComparison(data) {
    const ctx = document.getElementById('periodComparison').getContext('2d');
    
    if (charts.periodComparison) {
        charts.periodComparison.destroy();
    }

    const periods = [
        { name: 'Madrugada', start: 0, end: 6 },
        { name: 'Manhã', start: 6, end: 12 },
        { name: 'Tarde', start: 12, end: 18 },
        { name: 'Noite', start: 18, end: 24 }
    ];

    const periodData = periods.map(period => {
        const periodTests = data.filter(item => {
            const hour = new Date(item.created).getHours();
            return hour >= period.start && hour < period.end;
        });
        
        return {
            name: period.name,
            download: periodTests.length > 0 ? periodTests.reduce((sum, d) => sum + d.download, 0) / periodTests.length : 0,
            upload: periodTests.length > 0 ? periodTests.reduce((sum, d) => sum + d.upload, 0) / periodTests.length : 0,
            ping: periodTests.length > 0 ? periodTests.reduce((sum, d) => sum + d.ping, 0) / periodTests.length : 0,
            count: periodTests.length
        };
    });

    charts.periodComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: periodData.map(p => p.name),
            datasets: [
                {
                    label: 'Download',
                    data: periodData.map(p => p.download),
                    backgroundColor: colors.download,
                    borderColor: colors.border.download,
                    borderWidth: 1
                },
                {
                    label: 'Upload',
                    data: periodData.map(p => p.upload),
                    backgroundColor: colors.upload,
                    borderColor: colors.border.upload,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Criar gráfico de radar
function createRadarChart(data) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (charts.radarChart) {
        charts.radarChart.destroy();
    }

    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);
    
    const maxDownload = Math.max(...downloads);
    const maxUpload = Math.max(...uploads);
    const maxPing = Math.max(...pings);
    const avgDownload = downloads.reduce((a, b) => a + b, 0) / downloads.length;
    const avgUpload = uploads.reduce((a, b) => a + b, 0) / uploads.length;
    const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;

    charts.radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Download', 'Upload', 'Ping', 'Estabilidade', 'Consistência'],
            datasets: [
                {
                    label: 'Performance Normalizada',
                    data: [
                        (avgDownload / maxDownload) * 100,
                        (avgUpload / maxUpload) * 100,
                        100 - ((avgPing / maxPing) * 100),
                        80,
                        75
                    ],
                    backgroundColor: colors.download.replace('0.8', '0.2'),
                    borderColor: colors.border.download,
                    borderWidth: 2,
                    pointBackgroundColor: colors.border.download,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: colors.border.download
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

// Criar gráficos de análise por servidor
function createServerCharts(data) {
    const servers = [...new Set(data.map(d => d.serverId))];
    const serverStats = servers.map(serverId => {
        const serverData = data.filter(d => d.serverId === serverId);
        const downloads = serverData.map(d => d.download);
        const uploads = serverData.map(d => d.upload);
        const pings = serverData.map(d => d.ping);
        
        return {
            serverId,
            download: downloads.reduce((a, b) => a + b, 0) / downloads.length,
            upload: uploads.reduce((a, b) => a + b, 0) / uploads.length,
            ping: pings.reduce((a, b) => a + b, 0) / pings.length,
            count: serverData.length,
            stability: calculateStdDev(downloads, downloads.reduce((a, b) => a + b, 0) / downloads.length)
        };
    });

    // Performance por servidor
    const ctx1 = document.getElementById('serverPerformance').getContext('2d');
    if (charts.serverPerformance) charts.serverPerformance.destroy();
    charts.serverPerformance = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: serverStats.map(s => `Servidor ${s.serverId}`),
            datasets: [
                {
                    label: 'Download',
                    data: serverStats.map(s => s.download),
                    backgroundColor: colors.download,
                    borderColor: colors.border.download,
                    borderWidth: 1
                },
                {
                    label: 'Upload',
                    data: serverStats.map(s => s.upload),
                    backgroundColor: colors.upload,
                    borderColor: colors.border.upload,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Distribuição por servidor
    const ctx2 = document.getElementById('serverDistribution').getContext('2d');
    if (charts.serverDistribution) charts.serverDistribution.destroy();
    charts.serverDistribution = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: serverStats.map(s => `Servidor ${s.serverId}`),
            datasets: [{
                data: serverStats.map(s => s.count),
                backgroundColor: [
                    colors.download,
                    colors.upload,
                    colors.ping,
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'right' } }
        }
    });

    // Estabilidade por servidor
    const ctx3 = document.getElementById('serverStability').getContext('2d');
    if (charts.serverStability) charts.serverStability.destroy();
    charts.serverStability = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: serverStats.map(s => `Servidor ${s.serverId}`),
            datasets: [{
                label: 'Estabilidade (menor é melhor)',
                data: serverStats.map(s => s.stability),
                backgroundColor: colors.ping,
                borderColor: colors.border.ping,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Criar gráfico de coeficiente de variação
function createCoefficientVariationChart(data) {
    const ctx = document.getElementById('coefficientVariation').getContext('2d');
    
    if (charts.coefficientVariation) {
        charts.coefficientVariation.destroy();
    }

    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const windowSize = Math.max(10, Math.floor(sortedData.length / 30));
    const cvData = [];
    
    for (let i = windowSize; i < sortedData.length; i += windowSize) {
        const window = sortedData.slice(i - windowSize, i);
        const downloads = window.map(d => d.download);
        const uploads = window.map(d => d.upload);
        const meanDownload = downloads.reduce((a, b) => a + b, 0) / downloads.length;
        const meanUpload = uploads.reduce((a, b) => a + b, 0) / uploads.length;
        const stdDownload = calculateStdDev(downloads, meanDownload);
        const stdUpload = calculateStdDev(uploads, meanUpload);
        
        cvData.push({
            date: new Date(window[window.length - 1].created),
            cvDownload: (stdDownload / meanDownload) * 100,
            cvUpload: (stdUpload / meanUpload) * 100
        });
    }

    charts.coefficientVariation = new Chart(ctx, {
        type: 'line',
        data: {
            labels: cvData.map(d => d.date.toLocaleDateString('pt-BR')),
            datasets: [
                {
                    label: 'CV Download (%)',
                    data: cvData.map(d => d.cvDownload.toFixed(2)),
                    borderColor: colors.border.download,
                    backgroundColor: colors.download,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'CV Upload (%)',
                    data: cvData.map(d => d.cvUpload.toFixed(2)),
                    borderColor: colors.border.upload,
                    backgroundColor: colors.upload,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Criar gráfico de degradação (regressão linear simples)
function createDegradationChart(data) {
    const ctx = document.getElementById('degradationChart').getContext('2d');
    
    if (charts.degradationChart) {
        charts.degradationChart.destroy();
    }

    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const x = sortedData.map((_, i) => i);
    const yDownload = sortedData.map(d => d.download);
    const yUpload = sortedData.map(d => d.upload);
    
    // Regressão linear simples
    const linearRegression = (x, y) => {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return { slope, intercept };
    };

    const regDownload = linearRegression(x, yDownload);
    const regUpload = linearRegression(x, yUpload);
    
    const trendLineDownload = x.map(xi => regDownload.slope * xi + regDownload.intercept);
    const trendLineUpload = x.map(xi => regUpload.slope * xi + regUpload.intercept);

    charts.degradationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedData.map(d => new Date(d.created).toLocaleDateString('pt-BR')),
            datasets: [
                {
                    label: 'Download Real',
                    data: yDownload,
                    borderColor: colors.download,
                    backgroundColor: colors.download.replace('0.8', '0.1'),
                    borderWidth: 1,
                    pointRadius: 0
                },
                {
                    label: 'Tendência Download',
                    data: trendLineDownload,
                    borderColor: colors.border.download,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0
                },
                {
                    label: 'Upload Real',
                    data: yUpload,
                    borderColor: colors.upload,
                    backgroundColor: colors.upload.replace('0.8', '0.1'),
                    borderWidth: 1,
                    pointRadius: 0
                },
                {
                    label: 'Tendência Upload',
                    data: trendLineUpload,
                    borderColor: colors.border.upload,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
                y: { beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Criar gráfico de índice de estabilidade
function createStabilityIndexChart(data) {
    const ctx = document.getElementById('stabilityIndex').getContext('2d');
    
    if (charts.stabilityIndex) {
        charts.stabilityIndex.destroy();
    }

    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const windowSize = Math.max(10, Math.floor(sortedData.length / 20));
    const stabilityData = [];
    
    for (let i = windowSize; i < sortedData.length; i += windowSize) {
        const window = sortedData.slice(i - windowSize, i);
        const downloads = window.map(d => d.download);
        const uploads = window.map(d => d.upload);
        const meanDownload = downloads.reduce((a, b) => a + b, 0) / downloads.length;
        const meanUpload = uploads.reduce((a, b) => a + b, 0) / uploads.length;
        const stdDownload = calculateStdDev(downloads, meanDownload);
        const stdUpload = calculateStdDev(uploads, meanUpload);
        
        // Índice de estabilidade (0-100, maior é melhor)
        const stability = Math.max(0, 100 - ((stdDownload / meanDownload + stdUpload / meanUpload) * 50));
        
        stabilityData.push({
            date: new Date(window[window.length - 1].created),
            stability: stability
        });
    }

    charts.stabilityIndex = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stabilityData.map(d => d.date.toLocaleDateString('pt-BR')),
            datasets: [{
                label: 'Índice de Estabilidade',
                data: stabilityData.map(d => d.stability.toFixed(2)),
                borderColor: colors.border.download,
                backgroundColor: colors.download,
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Criar gráfico de consistência
function createConsistencyChart(data) {
    const ctx = document.getElementById('consistencyChart').getContext('2d');
    
    if (charts.consistencyChart) {
        charts.consistencyChart.destroy();
    }

    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const windowSize = Math.max(10, Math.floor(sortedData.length / 30));
    const consistencyData = [];
    
    for (let i = windowSize; i < sortedData.length; i += windowSize) {
        const window = sortedData.slice(i - windowSize, i);
        const downloads = window.map(d => d.download);
        const stdDownload = calculateStdDev(downloads, downloads.reduce((a, b) => a + b, 0) / downloads.length);
        
        consistencyData.push({
            date: new Date(window[window.length - 1].created),
            stdDev: stdDownload
        });
    }

    charts.consistencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: consistencyData.map(d => d.date.toLocaleDateString('pt-BR')),
            datasets: [{
                label: 'Desvio Padrão Móvel (Download)',
                data: consistencyData.map(d => d.stdDev.toFixed(2)),
                borderColor: colors.border.download,
                backgroundColor: colors.download,
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Criar gráficos de picos e vales
function createPeaksValleysCharts(data) {
    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const downloads = sortedData.map(d => d.download);
    const uploads = sortedData.map(d => d.upload);
    const pings = sortedData.map(d => d.ping);
    
    const meanDownload = downloads.reduce((a, b) => a + b, 0) / downloads.length;
    const meanUpload = uploads.reduce((a, b) => a + b, 0) / uploads.length;
    const stdDownload = calculateStdDev(downloads, meanDownload);
    const stdUpload = calculateStdDev(uploads, meanUpload);
    
    const peaks = sortedData.filter((d, i) => d.download > meanDownload + stdDownload);
    const valleys = sortedData.filter((d, i) => d.download < meanDownload - stdDownload);
    
    // Gráfico de picos
    const ctx1 = document.getElementById('peaksChart').getContext('2d');
    if (charts.peaksChart) charts.peaksChart.destroy();
    charts.peaksChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: peaks.map(p => new Date(p.created).toLocaleDateString('pt-BR')),
            datasets: [{
                label: 'Picos de Performance',
                data: peaks.map(p => p.download),
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: 'rgba(76, 175, 80, 1)',
                pointRadius: 5,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } }
            }
        }
    });
    
    // Gráfico de vales
    const ctx2 = document.getElementById('valleysChart').getContext('2d');
    if (charts.valleysChart) charts.valleysChart.destroy();
    charts.valleysChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: valleys.map(v => new Date(v.created).toLocaleDateString('pt-BR')),
            datasets: [{
                label: 'Vales de Performance',
                data: valleys.map(v => v.download),
                backgroundColor: 'rgba(244, 67, 54, 0.6)',
                borderColor: 'rgba(244, 67, 54, 1)',
                pointRadius: 5,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } }
            }
        }
    });
    
    // Atualizar estatísticas
    document.getElementById('peak-download').textContent = `${Math.max(...downloads).toFixed(2)} Mbps`;
    document.getElementById('valley-download').textContent = `${Math.min(...downloads).toFixed(2)} Mbps`;
    document.getElementById('peak-upload').textContent = `${Math.max(...uploads).toFixed(2)} Mbps`;
    document.getElementById('valley-upload').textContent = `${Math.min(...uploads).toFixed(2)} Mbps`;
    document.getElementById('peak-ping').textContent = `${Math.max(...pings).toFixed(2)} ms`;
    document.getElementById('valley-ping').textContent = `${Math.min(...pings).toFixed(2)} ms`;
}

// Atualizar estatísticas por período do dia
function updatePeriodStats(data) {
    const periods = [
        { name: 'Madrugada', start: 0, end: 6 },
        { name: 'Manhã', start: 6, end: 12 },
        { name: 'Tarde', start: 12, end: 18 },
        { name: 'Noite', start: 18, end: 24 }
    ];

    periods.forEach((period, index) => {
        const periodTests = data.filter(item => {
            const hour = new Date(item.created).getHours();
            return hour >= period.start && hour < period.end;
        });
        
        if (periodTests.length > 0) {
            const avgDownload = periodTests.reduce((sum, d) => sum + d.download, 0) / periodTests.length;
            const avgUpload = periodTests.reduce((sum, d) => sum + d.upload, 0) / periodTests.length;
            const avgPing = periodTests.reduce((sum, d) => sum + d.ping, 0) / periodTests.length;
            
            document.getElementById(`period-download-${index}`).textContent = `${avgDownload.toFixed(2)} Mbps`;
            document.getElementById(`period-upload-${index}`).textContent = `${avgUpload.toFixed(2)} Mbps`;
            document.getElementById(`period-ping-${index}`).textContent = `${avgPing.toFixed(2)} ms`;
            document.getElementById(`period-count-${index}`).textContent = periodTests.length;
        } else {
            document.getElementById(`period-download-${index}`).textContent = 'N/A';
            document.getElementById(`period-upload-${index}`).textContent = 'N/A';
            document.getElementById(`period-ping-${index}`).textContent = 'N/A';
            document.getElementById(`period-count-${index}`).textContent = '0';
        }
    });
}

// Criar gráfico de frequência
function createFrequencyChart(data) {
    const ctx = document.getElementById('frequencyChart').getContext('2d');
    
    if (charts.frequencyChart) {
        charts.frequencyChart.destroy();
    }

    const frequencyByDate = {};
    data.forEach(item => {
        const date = new Date(item.created).toLocaleDateString('pt-BR');
        frequencyByDate[date] = (frequencyByDate[date] || 0) + 1;
    });

    const sortedDates = Object.keys(frequencyByDate).sort();
    const frequencies = sortedDates.map(date => frequencyByDate[date]);

    charts.frequencyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Testes por Dia',
                data: frequencies,
                backgroundColor: colors.download,
                borderColor: colors.border.download,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } }
            }
        }
    });
    
    // Estatísticas de frequência
    const avgPerDay = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const maxDay = sortedDates[frequencies.indexOf(Math.max(...frequencies))];
    const minDay = sortedDates[frequencies.indexOf(Math.min(...frequencies))];
    
    document.getElementById('tests-per-day').textContent = `${avgPerDay.toFixed(1)}`;
    document.getElementById('max-tests-day').textContent = maxDay;
    document.getElementById('min-tests-day').textContent = minDay;
}

// Criar gráfico de intervalo
function createIntervalChart(data) {
    const ctx = document.getElementById('intervalChart').getContext('2d');
    
    if (charts.intervalChart) {
        charts.intervalChart.destroy();
    }

    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const intervals = [];
    
    for (let i = 1; i < sortedData.length; i++) {
        const interval = (new Date(sortedData[i].created) - new Date(sortedData[i-1].created)) / (1000 * 60 * 60); // em horas
        intervals.push(interval);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    document.getElementById('avg-interval').textContent = `${avgInterval.toFixed(2)} horas`;

    // Criar histograma de intervalos
    const bucketSize = Math.max(1, Math.ceil((Math.max(...intervals) - Math.min(...intervals)) / 20));
    const buckets = {};
    intervals.forEach(interval => {
        const bucket = Math.floor(interval / bucketSize) * bucketSize;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
    });

    charts.intervalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(buckets).sort((a, b) => a - b).map(k => `${parseFloat(k).toFixed(0)}h`),
            datasets: [{
                label: 'Frequência de Intervalos',
                data: Object.keys(buckets).sort((a, b) => a - b).map(k => buckets[k]),
                backgroundColor: colors.upload,
                borderColor: colors.border.upload,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Atualizar métricas avançadas
function updateAdvancedMetrics(data) {
    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);
    
    const meanDownload = downloads.reduce((a, b) => a + b, 0) / downloads.length;
    const meanUpload = uploads.reduce((a, b) => a + b, 0) / uploads.length;
    const meanPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    
    const stdDownload = calculateStdDev(downloads, meanDownload);
    const stdUpload = calculateStdDev(uploads, meanUpload);
    const stdPing = calculateStdDev(pings, meanPing);
    
    // Variâncias
    const varianceDownload = calculateVariance(downloads, meanDownload);
    const varianceUpload = calculateVariance(uploads, meanUpload);
    const variancePing = calculateVariance(pings, meanPing);
    
    document.getElementById('variance-download').textContent = varianceDownload.toFixed(2);
    document.getElementById('variance-upload').textContent = varianceUpload.toFixed(2);
    document.getElementById('variance-ping').textContent = variancePing.toFixed(2);
    
    // Coeficiente de variação
    const cvDownload = (stdDownload / meanDownload) * 100;
    const cvUpload = (stdUpload / meanUpload) * 100;
    const cvOverall = ((cvDownload + cvUpload) / 2).toFixed(2);
    document.getElementById('cv-overall').textContent = `${cvOverall}%`;
    
    // Skewness
    const skewDownload = calculateSkewness(downloads, meanDownload, stdDownload);
    const skewUpload = calculateSkewness(uploads, meanUpload, stdUpload);
    const skewPing = calculateSkewness(pings, meanPing, stdPing);
    
    document.getElementById('skewness-download').textContent = skewDownload;
    document.getElementById('skewness-upload').textContent = skewUpload;
    document.getElementById('skewness-ping').textContent = skewPing;
    
    // Determinar tipo de distribuição
    const avgSkew = (parseFloat(skewDownload) + parseFloat(skewUpload)) / 2;
    let distType = 'Normal';
    if (Math.abs(avgSkew) > 1) distType = 'Muito Assimétrica';
    else if (Math.abs(avgSkew) > 0.5) distType = 'Moderadamente Assimétrica';
    document.getElementById('distribution-type').textContent = distType;
    
    // Kurtosis
    const kurtDownload = calculateKurtosis(downloads, meanDownload, stdDownload);
    const kurtUpload = calculateKurtosis(uploads, meanUpload, stdUpload);
    const kurtPing = calculateKurtosis(pings, meanPing, stdPing);
    
    document.getElementById('kurtosis-download').textContent = kurtDownload;
    document.getElementById('kurtosis-upload').textContent = kurtUpload;
    document.getElementById('kurtosis-ping').textContent = kurtPing;
    
    // Tipo de pico
    const avgKurt = (parseFloat(kurtDownload) + parseFloat(kurtUpload)) / 2;
    let peakType = 'Normal';
    if (avgKurt > 3) peakType = 'Pico Agudo (Leptocúrtica)';
    else if (avgKurt < -1) peakType = 'Pico Achatado (Platicúrtica)';
    document.getElementById('peak-type').textContent = peakType;
    
    // Índices de qualidade
    const reliability = Math.max(0, 100 - cvOverall).toFixed(1);
    const consistency = Math.max(0, 100 - (stdDownload / meanDownload * 50)).toFixed(1);
    const performance = ((meanDownload / 500 + meanUpload / 500) * 50).toFixed(1);
    const overallScore = ((parseFloat(reliability) + parseFloat(consistency) + parseFloat(performance)) / 3).toFixed(1);
    
    document.getElementById('reliability-index').textContent = `${reliability}/100`;
    document.getElementById('consistency-index').textContent = `${consistency}/100`;
    document.getElementById('performance-index').textContent = `${performance}/100`;
    document.getElementById('overall-score').textContent = `${overallScore}/100`;
}

// Gerar alertas
function generateAlerts(data) {
    const container = document.getElementById('alerts-container');
    container.innerHTML = '';
    
    const alerts = [];
    const downloads = data.map(d => d.download);
    const uploads = data.map(d => d.upload);
    const pings = data.map(d => d.ping);
    
    const meanDownload = downloads.reduce((a, b) => a + b, 0) / downloads.length;
    const meanUpload = uploads.reduce((a, b) => a + b, 0) / uploads.length;
    const meanPing = pings.reduce((a, b) => a + b, 0) / pings.length;
    
    // Verificar velocidade baixa
    if (meanDownload < 100) {
        alerts.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Velocidade de Download Baixa',
            message: `A velocidade média de download (${meanDownload.toFixed(2)} Mbps) está abaixo do recomendado.`
        });
    }
    
    if (meanUpload < 50) {
        alerts.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Velocidade de Upload Baixa',
            message: `A velocidade média de upload (${meanUpload.toFixed(2)} Mbps) está abaixo do recomendado.`
        });
    }
    
    // Verificar ping alto
    if (meanPing > 50) {
        alerts.push({
            type: 'error',
            icon: '🔴',
            title: 'Latência Alta',
            message: `O ping médio (${meanPing.toFixed(2)} ms) está acima do ideal para atividades online.`
        });
    }
    
    // Verificar inconsistência
    const stdDownload = calculateStdDev(downloads, meanDownload);
    const cvDownload = (stdDownload / meanDownload) * 100;
    if (cvDownload > 30) {
        alerts.push({
            type: 'warning',
            icon: '📉',
            title: 'Alta Variabilidade',
            message: `A conexão apresenta alta variabilidade (CV: ${cvDownload.toFixed(1)}%). Considere investigar a causa.`
        });
    }
    
    // Verificar outliers
    const outliers = detectOutliers(downloads);
    if (outliers.length > data.length * 0.1) {
        alerts.push({
            type: 'info',
            icon: 'ℹ️',
            title: 'Muitos Outliers Detectados',
            message: `${outliers.length} testes apresentaram valores anômalos. Isso pode indicar problemas intermitentes.`
        });
    }
    
    // Verificar tendência de degradação
    const sortedData = [...data].sort((a, b) => new Date(a.created) - new Date(b.created));
    const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
    const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));
    const avgFirst = firstHalf.reduce((sum, d) => sum + d.download, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, d) => sum + d.download, 0) / secondHalf.length;
    
    if (avgSecond < avgFirst * 0.9) {
        alerts.push({
            type: 'error',
            icon: '📉',
            title: 'Degradação Detectada',
            message: `A velocidade média diminuiu ${((1 - avgSecond/avgFirst) * 100).toFixed(1)}% comparando a primeira e segunda metade do período.`
        });
    }
    
    // Exibir alertas
    if (alerts.length === 0) {
        alerts.push({
            type: 'success',
            icon: '✅',
            title: 'Tudo em Ordem',
            message: 'Nenhum problema crítico detectado nos dados analisados.'
        });
    }
    
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-item ${alert.type}`;
        alertDiv.innerHTML = `
            <div class="alert-icon">${alert.icon}</div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-message">${alert.message}</div>
            </div>
        `;
        container.appendChild(alertDiv);
    });
}

// Atualizar todos os gráficos avançados
function updateAdvancedCharts(data) {
    // Heatmaps
    createHeatmap('heatmapDownload', data, 'download', 'Download');
    createHeatmap('heatmapUpload', data, 'upload', 'Upload');
    createHeatmap('heatmapPing', data, 'ping', 'Ping');
    
    // Comparações
    createComparisonChart(data);
    createEvolutionChart(data);
    createPeriodComparison(data);
    createRadarChart(data);
    
    // Análise por servidor
    createServerCharts(data);
    
    // Degradação e estabilidade
    createCoefficientVariationChart(data);
    createDegradationChart(data);
    createStabilityIndexChart(data);
    createConsistencyChart(data);
    
    // Picos e vales
    createPeaksValleysCharts(data);
    
    // Frequência
    createFrequencyChart(data);
    createIntervalChart(data);
}

// Atualizar dashboard completo
function updateDashboard() {
    applyFilters();
    updateStats(filteredData);
    updateHeaderInfo(filteredData);
    updateCharts(filteredData);
    updateTable(filteredData);
    
    // Novas análises avançadas
    updatePercentiles(filteredData);
    updateOutliers(filteredData);
    updatePeriodStats(filteredData);
    updateAdvancedMetrics(filteredData);
    generateAlerts(filteredData);
    updateAdvancedCharts(filteredData);
}

// Event listeners
document.getElementById('period-filter').addEventListener('change', () => updateDashboard());
document.getElementById('data-points').addEventListener('change', () => updateCharts(filteredData));
document.getElementById('server-filter').addEventListener('change', () => updateDashboard());
document.getElementById('min-download').addEventListener('input', () => updateDashboard());
document.getElementById('min-upload').addEventListener('input', () => updateDashboard());
document.getElementById('table-search').addEventListener('input', () => renderTable());
document.getElementById('table-rows').addEventListener('change', () => renderTable());
document.getElementById('export-btn').addEventListener('click', exportReport);
document.getElementById('refresh-btn').addEventListener('click', () => loadData());

// Tornar sortTable global
window.sortTable = sortTable;

// Inicializar
loadData();
