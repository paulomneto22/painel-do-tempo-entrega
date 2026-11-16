const formBusca = document.getElementById("formBusca");
const campoCidade = document.getElementById("cidade");
const botaoBuscar = document.getElementById("botaoBuscar");
const limparBusca = document.getElementById("limparBusca");
const mensagem = document.getElementById("mensagem");
const textoMensagem = document.getElementById("textoMensagem");
const painelClima = document.getElementById("painelClima");
const listaPrevisao = document.getElementById("listaPrevisao");

let numeroConsulta = 0;

formBusca.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const cidade = campoCidade.value.trim();

    if (cidade === "") {
        mostrarMensagem("Digite o nome de uma cidade antes de pesquisar.", "erro");
        campoCidade.focus();
        return;
    }

    buscarClima(cidade);
});

campoCidade.addEventListener("input", function () {
    limparBusca.classList.toggle("visivel", campoCidade.value.length > 0);
});

limparBusca.addEventListener("click", function () {
    campoCidade.value = "";
    limparBusca.classList.remove("visivel");
    campoCidade.focus();
});

document.querySelectorAll(".cidade-rapida").forEach(function (botao) {
    botao.addEventListener("click", function () {
        const cidade = botao.dataset.cidade;

        campoCidade.value = cidade;
        limparBusca.classList.add("visivel");

        buscarClima(cidade);
    });
});

async function buscarClima(cidade) {
    const consultaAtual = ++numeroConsulta;

    botaoBuscar.disabled = true;
    botaoBuscar.innerHTML = "Consultando... <span class='seta-botao'>↻</span>";

    painelClima.hidden = true;

    mostrarMensagem(
        "Localizando a cidade e consultando os dados meteorológicos...",
        "carregando"
    );

    try {
        const enderecoGeocodificacao =
            "https://geocoding-api.open-meteo.com/v1/search?" +
            new URLSearchParams({
                name: cidade,
                count: "10",
                language: "pt",
                format: "json"
            });

        const respostaCidade = await fetch(enderecoGeocodificacao);

        if (!respostaCidade.ok) {
            throw new Error("Não foi possível localizar a cidade. Tente novamente.");
        }

        const dadosCidade = await respostaCidade.json();

        if (consultaAtual !== numeroConsulta) {
            return;
        }

        if (!dadosCidade.results || dadosCidade.results.length === 0) {
            throw new Error(
                "Cidade não encontrada. Confira o nome digitado e tente novamente."
            );
        }

        const local = dadosCidade.results[0];

        const parametrosClima = new URLSearchParams({
            latitude: local.latitude,
            longitude: local.longitude,

            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "weather_code",
                "wind_speed_10m"
            ].join(","),

            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max"
            ].join(","),

            temperature_unit: "celsius",
            wind_speed_unit: "kmh",
            timezone: "auto",
            forecast_days: "5"
        });

        const enderecoClima =
            "https://api.open-meteo.com/v1/forecast?" +
            parametrosClima;

        const respostaClima = await fetch(enderecoClima);

        if (!respostaClima.ok) {
            throw new Error(
                "Não foi possível consultar o clima agora. Tente novamente."
            );
        }

        const dadosClima = await respostaClima.json();

        if (consultaAtual !== numeroConsulta) {
            return;
        }

        if (!dadosClima.current) {
            throw new Error("Os dados meteorológicos não estão disponíveis.");
        }

        mostrarClima(local, dadosClima);
        mostrarMensagem("Dados meteorológicos carregados com sucesso.", "sucesso");

    } catch (erro) {
        if (consultaAtual !== numeroConsulta) {
            return;
        }

        painelClima.hidden = true;

        if (erro instanceof TypeError) {
            mostrarMensagem(
                "Não foi possível conectar à API. Verifique sua internet e tente novamente.",
                "erro"
            );
        } else {
            mostrarMensagem(
                erro.message || "Ocorreu um erro inesperado. Tente novamente.",
                "erro"
            );
        }

    } finally {
        if (consultaAtual === numeroConsulta) {
            botaoBuscar.disabled = false;

            botaoBuscar.innerHTML =
                'Consultar clima <span class="seta-botao">↗</span>';
        }
    }
}

function mostrarClima(local, dadosClima) {
    const atual = dadosClima.current;

    const partesLocal = [
        local.name,
        local.admin1,
        local.country
    ].filter(Boolean);

    document.getElementById("nomeCidade").textContent =
        [...new Set(partesLocal)].join(", ");

    document.getElementById("dataAtual").textContent =
        formatarDataHora(atual.time);

    document.getElementById("temperatura").textContent =
        Math.round(atual.temperature_2m);

    document.getElementById("sensacaoTermica").textContent =
        Math.round(atual.apparent_temperature);

    document.getElementById("umidade").textContent =
        atual.relative_humidity_2m;

    document.getElementById("vento").textContent =
        Math.round(atual.wind_speed_10m);

    document.getElementById("descricaoClima").textContent =
        obterCondicao(atual.weather_code);

    document.getElementById("iconeClima").textContent =
        obterIcone(atual.weather_code, atual.is_day);

    document.getElementById("barraUmidade").style.width =
        Math.max(0, Math.min(100, atual.relative_humidity_2m)) + "%";

    mostrarPrevisao(dadosClima.daily);

    painelClima.hidden = false;
}

function mostrarPrevisao(dados) {
    if (!dados || !dados.time) {
        listaPrevisao.innerHTML = "";
        return;
    }

    listaPrevisao.innerHTML = "";

    dados.time.forEach(function (data, indice) {
        const codigo = dados.weather_code[indice];

        const max = dados.temperature_2m_max[indice];
        const min = dados.temperature_2m_min[indice];

        const probabilidade = dados.precipitation_probability_max
            ? dados.precipitation_probability_max[indice]
            : null;

        const card = document.createElement("article");
        card.className = "previsao-card";

        const dia = document.createElement("p");
        dia.className = "previsao-dia";
        dia.textContent = obterDiaSemana(data, indice);

        const icone = document.createElement("span");
        icone.className = "previsao-emoji";
        icone.textContent = obterIcone(codigo, 1);

        const condicao = document.createElement("p");
        condicao.className = "previsao-condicao";
        condicao.textContent = obterCondicao(codigo);

        const temperaturas = document.createElement("div");
        temperaturas.className = "previsao-temperaturas";

        const maxima = document.createElement("span");
        maxima.className = "previsao-maxima";
        maxima.textContent = Math.round(max) + "°";

        const minima = document.createElement("span");
        minima.className = "previsao-minima";
        minima.textContent = Math.round(min) + "°";

        temperaturas.append(maxima, minima);

        card.append(dia, icone, condicao, temperaturas);

        if (probabilidade !== null && probabilidade !== undefined) {
            const chuva = document.createElement("p");
            chuva.className = "previsao-chuva";
            chuva.textContent = "☂ " + probabilidade + "% de chuva";

            card.appendChild(chuva);
        }

        listaPrevisao.appendChild(card);
    });
}

function mostrarMensagem(texto, tipo) {
    textoMensagem.textContent = texto;

    mensagem.className = "mensagem";

    if (tipo) {
        mensagem.classList.add(tipo);
    }

    const icone = mensagem.querySelector(".mensagem-icone");

    if (tipo === "erro") {
        icone.textContent = "!";
    } else if (tipo === "sucesso") {
        icone.textContent = "✓";
    } else if (tipo === "carregando") {
        icone.textContent = "◌";
    } else {
        icone.textContent = "✦";
    }
}

function formatarDataHora(dataHora) {
    if (!dataHora) {
        return "Horário local indisponível";
    }

    const partes = dataHora.split("T");
    const partesData = partes[0].split("-");

    const dataLocal = new Date(
        Number(partesData[0]),
        Number(partesData[1]) - 1,
        Number(partesData[2]),
        12
    );

    const dataFormatada = dataLocal.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const hora = partes[1] ? partes[1].slice(0, 5) : "";

    return hora
        ? dataFormatada + " • " + hora + " (horário local)"
        : dataFormatada;
}

function obterDiaSemana(data, indice) {
    if (indice === 0) {
        return "Hoje";
    }

    if (!data) {
        return "—";
    }

    const partes = data.split("-");

    const dataLocal = new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2]),
        12
    );

    return dataLocal.toLocaleDateString("pt-BR", {
        weekday: "short"
    }).replace(".", "");
}

function obterCondicao(codigo) {
    const condicoes = {
        0: "Céu limpo",
        1: "Predominantemente limpo",
        2: "Parcialmente nublado",
        3: "Nublado",
        45: "Neblina",
        48: "Neblina com geada",
        51: "Garoa leve",
        53: "Garoa moderada",
        55: "Garoa intensa",
        56: "Garoa congelante leve",
        57: "Garoa congelante intensa",
        61: "Chuva fraca",
        63: "Chuva moderada",
        65: "Chuva forte",
        66: "Chuva congelante leve",
        67: "Chuva congelante forte",
        71: "Neve fraca",
        73: "Neve moderada",
        75: "Neve forte",
        77: "Grãos de neve",
        80: "Pancadas de chuva fracas",
        81: "Pancadas de chuva moderadas",
        82: "Pancadas de chuva fortes",
        85: "Pancadas de neve fracas",
        86: "Pancadas de neve fortes",
        95: "Trovoadas",
        96: "Trovoadas com granizo leve",
        99: "Trovoadas com granizo forte"
    };

    return condicoes[codigo] || "Condição não identificada";
}

function obterIcone(codigo, dia) {
    if (codigo === 0) {
        return dia ? "☀️" : "🌙";
    }

    if (codigo === 1) {
        return dia ? "🌤️" : "🌙";
    }

    if (codigo === 2) {
        return "⛅";
    }

    if (codigo === 3) {
        return "☁️";
    }

    if (codigo === 45 || codigo === 48) {
        return "🌫️";
    }

    if (codigo >= 51 && codigo <= 67) {
        return "🌧️";
    }

    if (codigo >= 71 && codigo <= 77) {
        return "❄️";
    }

    if (codigo >= 80 && codigo <= 82) {
        return "🌦️";
    }

    if (codigo === 85 || codigo === 86) {
        return "🌨️";
    }

    if (codigo >= 95) {
        return "⛈️";
    }

    return "🌡️";
}