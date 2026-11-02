(() => {
  'use strict';
  // Guarda referências aos elementos da página usados pelo formulário e pelos resultados.
  // const API_URL = 'http://127.0.0.1:8000/prever';
  const form = document.getElementById('prediction-form');
  const error = document.getElementById('request-error');
  const submit = document.getElementById('submit-prediction');
  const submitLabel = document.getElementById('submit-label');
  const result = document.getElementById('result-content');
  const status = document.getElementById('result-state');
  const address = document.getElementById('address');
  const searchBtn = document.getElementById('search-address');
  const geocodeMessage = document.getElementById('geocode-feedback');
  const levels = { baixo: {name:'BAIXO',color:'#10b981'}, medio: {name:'MÉDIO',color:'#f59e0b'}, alto: {name:'ALTO',color:'#ef4444'} };

  // Padroniza textos e centraliza a exibição de erros e o estado de carregamento.
  const normalize = value => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function clearError(){ error.hidden = true; error.textContent = ''; }
  function showError(message){ error.hidden = false; error.textContent = message; }
  function setBusy(busy){ submit.disabled = busy; submitLabel.textContent = busy ? 'SIMULANDO PREVISÃO...' : 'SIMULAR PREVISÃO'; }

  function simulatePrediction(payload) {

    // Apenas cenários de demonstração; o índice não mede risco real.
    // Entradas iguais selecionam o mesmo cenário para facilitar a apresentação.
    const scenarios = [
      { nivel_risco: 'baixo', probabilidade: 0.24 },
      { nivel_risco: 'medio', probabilidade: 0.57 },
      { nivel_risco: 'alto', probabilidade: 0.83 }
    ];

    const seed = Array.from(JSON.stringify(payload)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return {
      ...scenarios[seed % scenarios.length],
      simulado: true,
      fatores: [
        'Demonstração: Classificação e probabilidade fictícias para demonstrar a interface.',
        `Ponto selecionado: ${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}.`,
        `Parâmetros da demonstração: mês ${payload.mes}, horário ${payload.horario}.`
      ]
    };
  }

  // Monta o resultado na página e atualiza o mapa com a categoria selecionada.
  function renderPrediction(data, coords){
    const key = normalize(data.nivel_risco ?? data.risco);
    if (!Object.hasOwn(levels, key)) throw new Error('A resposta contém um nível de risco não reconhecido.');
    const simulated = data.simulado === true;
    const score = levels[key];
    result.replaceChildren();
    const layout = document.createElement('div'); layout.className = 'result-loaded';
    const grade = document.createElement('div'); grade.className = 'result-score'; grade.style.setProperty('--risk-color', score.color);
    const small = document.createElement('div');small.className='result-data-label';small.textContent=simulated ? 'CLASSIFICAÇÃO SIMULADA' : 'CLASSIFICAÇÃO ESTIMADA';
    const name = document.createElement('strong');name.className='risk-level';name.textContent=score.name;
    const probability = document.createElement('span');probability.className='risk-probability';
    const p = Number(data.probabilidade);
    probability.textContent = data.probabilidade !== undefined && data.probabilidade !== null && Number.isFinite(p) && p >= 0 && p <= 1 ? `${simulated ? 'PROBABILIDADE SIMULADA' : 'PROBABILIDADE'}: ${(p * 100).toFixed(1)}%` : 'PROBABILIDADE: NÃO INFORMADA';
    grade.append(small,name,probability);
    const factors = document.createElement('div'); factors.className='factors';
    const caption = document.createElement('div');caption.className='factor-caption';caption.textContent=simulated ? 'DADOS DA SIMULAÇÃO' : 'FATORES EXPLICATIVOS';factors.append(caption);
    if (Array.isArray(data.fatores) && data.fatores.length) {
      if (simulated) {
        const details = document.createElement('div');
        details.className = 'simulation-details';
        for (const factor of data.fatores.slice(0,5)) {
          const description = document.createElement('p');
          description.className = 'simulation-detail';
          const text = String(factor);
          const separator = text.indexOf(':');
          if (separator >= 0) {
            const label = document.createElement('strong');
            label.textContent = text.slice(0, separator + 1);
            description.append(label, ` ${text.slice(separator + 1).trim()}`);
          } else {
            description.textContent = text;
          }
          details.append(description);
        }
        factors.append(details);
      } else {
        const list = document.createElement('ul');
        for (const factor of data.fatores.slice(0,5)) {const li=document.createElement('li');li.textContent=String(factor);list.append(li);}
        factors.append(list);
      }
    } else {
      const note = document.createElement('p'); note.textContent='O modelo não forneceu fatores explicativos para esta previsão.';factors.append(note);
    }
    const caution = document.createElement('div');caution.className='result-note';caution.textContent=simulated ? 'Demonstração com dados fictícios, sem consulta ao modelo de previsão.' : 'Estimativa estatística sujeita a limitações de dados e do modelo.';factors.append(caution);
    layout.append(grade,factors);result.append(layout);
    status.textContent=simulated ? 'SIMULAÇÃO CONCLUÍDA' : 'PREVISÃO CONCLUÍDA';
    window.RiskMap.showPrediction(coords.latitude,coords.longitude,key);
  }

  // Valida os campos e executa a simulação local ao enviar o formulário.
  form.addEventListener('submit', async event => {
    event.preventDefault();clearError();
    if (submit.disabled) return;
    if (!form.reportValidity()) return;
    const payload = {
      latitude: Number(document.getElementById('latitude').value),
      longitude: Number(document.getElementById('longitude').value),
      dia_semana: Number(document.getElementById('weekday').value),
      mes: Number(document.getElementById('month').value),
      horario: document.getElementById('time').value
    };
    if (!window.RiskMap.selectPoint(payload.latitude,payload.longitude,false)) {showError('Coordenadas inválidas.');return;}
    setBusy(true);status.textContent='SIMULANDO PREVISÃO';

    /* INTEGRAÇÃO REAL COM FASTAPI — desativada para a demonstração.
    status.textContent='CONSULTANDO API';
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Falha na API (HTTP ${response.status}). Verifique o endpoint e os parâmetros.`);
      const data = await response.json();
      renderPrediction(data,payload);
      document.getElementById('kpi-api-status').textContent = 'API conectada';
      document.getElementById('kpi-api-detail').textContent = 'Última consulta bem-sucedida';
    } catch (e) {
      status.textContent='CONSULTA NÃO CONCLUÍDA';
      document.getElementById('kpi-api-status').textContent='API indisponível';
      document.getElementById('kpi-api-detail').textContent='Verifique o backend';
      showError(e.name === 'TimeoutError' ? 'Tempo limite excedido ao consultar a API.' : (e instanceof TypeError ? 'Não foi possível conectar à API. Confirme se o FastAPI está ativo e se o CORS está configurado.' : e.message));
    } finally {setBusy(false);}
    */

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      renderPrediction(simulatePrediction(payload), payload);
      document.getElementById('kpi-api-status').textContent='Modo demonstração';
      document.getElementById('kpi-api-detail').textContent='Última simulação concluída';
    } catch (e) {
      status.textContent='SIMULAÇÃO NÃO CONCLUÍDA';
      showError(e.message || 'Não foi possível concluir a simulação.');
    } finally {setBusy(false);}
  });

  // Busca opcional com o serviço público Nominatim (uso moderado, sem autocomplete).
  async function findAddress(){
    const query = address.value.trim(); if (!query) {geocodeMessage.textContent='Digite um endereço em Curitiba para pesquisar.';return;}
    searchBtn.disabled = true; geocodeMessage.textContent='Buscando endereço...';
    try {
      const localQuery = normalize(query).includes('curitiba') ? query : `${query}, Curitiba, Paraná, Brasil`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(localQuery)}`;
      const response = await fetch(url, {headers:{'Accept':'application/json'},signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('Serviço de endereços indisponível.');
      const locations=await response.json();
      if (!locations.length) {geocodeMessage.textContent='Nenhum endereço encontrado em Curitiba. Tente incluir o número ou o bairro.';return;}
      const selected=locations[0];
      window.RiskMap.selectPoint(Number(selected.lat),Number(selected.lon));
      window.RiskMap.map.setZoom(15);
      geocodeMessage.textContent='Endereço localizado. Confira o ponto no mapa.';
    } catch(e){geocodeMessage.textContent=e.name==='TimeoutError'?'Busca demorou demais. Tente novamente.':'Não foi possível buscar o endereço agora.';}
    finally {searchBtn.disabled=false;}
  }
  searchBtn.addEventListener('click',findAddress);
  address.addEventListener('keydown',event => {if(event.key==='Enter'){event.preventDefault();findAddress();}});
  const now=new Date();document.getElementById('month').value=String(now.getMonth()+1);
  document.getElementById('weekday').value=String((now.getDay()+6)%7);
})();
