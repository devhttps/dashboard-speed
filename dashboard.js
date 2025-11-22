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

// Atualizar dashboard completo
function updateDashboard() {
    applyFilters();
    updateStats(filteredData);
    updateHeaderInfo(filteredData);
    updateCharts(filteredData);
    updateTable(filteredData);
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
