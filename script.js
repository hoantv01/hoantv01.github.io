let rawData = [];
let currentFile = "dbhc.txt";
let lastResult = [];

// BỘ NHỚ ĐỆM
const fileCache = {};

const input = document.getElementById("searchInput");
const tbody = document.getElementById("results");
const thead = document.getElementById("table-head");
const tabs = document.querySelectorAll(".tab");

/* =====================
   TỪ ĐIỂN ĐỒNG NGHĨA NGÂN HÀNG (ALIAS)
===================== */
const bankAliases = [
    ["a chau", "acb"],
    ["an binh", "abbank"],
    ["bac a", "bac a bank"],
    ["ban viet", "bvbank"],
    ["bao viet", "baoviet"],
    ["cong thuong", "vietinbank"],
    ["dai chung", "pvcombank"],
    ["dau tu", "bidv"], 
    ["dong nam a", "seabank"],
    ["hang hai", "msb"],
    ["kien long", "kienlongbank"],
    ["ky thuong", "techcombank"],
    ["loc phat", "lvbank lpbank"],
    ["nam a", "nam a bank"],
    ["ngoai thuong", "vietcombank vcb"],
    ["phat trien tphcm", "hdbank"],
    ["phat trien tp", "hdbank"],
    ["phuong dong", "ocb"],
    ["quan doi", "mbbank mb"],
    ["quoc dan", "ncb"],
    ["quoc te", "vib"],
    ["sai gon ha noi", "shb"],
    ["sai gon cong thuong", "saigonbank"],
    ["sai gon thuong tin", "sacombank"],
    ["sai gon", "scb"], 
    ["thinh vuong va phat", "pgbank"],
    ["tien phong", "tpbank"],
    ["viet a", "vietabank"],
    ["viet nam thinh vuong", "vpbank vpb"],
    ["viet nam thuong tin", "vietbank"],
    ["xuat nhap khau", "eximbank"],
    ["ky nguyen", "gpbank"],
    ["cong nghe so", "vcbneo"],
    ["vikki", "so vikki"],
    ["hien dai", "mbv"],
    ["indovina", "ivb"],
    ["viet nga", "vrb"],
    ["chinh sach", "vbsp"],
    ["hop tac xa", "coopbank"],
    ["nong nghiep", "agribank"],
    ["nong thon", "agribank"],
    ["nn pt", "agribank"]
];

/* =====================
   CHUẨN HÓA TIẾNG VIỆT
===================== */
function normalize(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* =====================
  RENDER KẾT QUẢ
===================== */
function renderResults(results, keyword) {
    tbody.innerHTML = "";
    lastResult = results;
    
    const highlightKeys = keyword.split(" ").filter(k => k.trim() !== "");

    results.forEach(obj => {
        const cols = obj.line.split(/\t| {2,}/);
        const tr = document.createElement("tr");

        cols.forEach(col => {
            let html = col;
            highlightKeys.forEach(k => {
                if (k.length > 0) {
                    const safeK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const reg = new RegExp(`(${safeK})`, "gi");
                    html = html.replace(reg, "<mark>$1</mark>");
                }
            });

            const td = document.createElement("td");
            td.innerHTML = html;
            tr.appendChild(td);
        });

        tr.onclick = () => {
            let textToCopy = cols[0] || ""; 
            let message = "Đã copy Mã: " + textToCopy;

            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => alert(message))
                    .catch(err => console.error("Lỗi copy: ", err));
            }
        };
        tr.style.cursor = "pointer";
        tbody.appendChild(tr);
    });
}

/* =====================
   LOAD FILE 
===================== */
async function loadFile(file) {
    input.value = "";
    tbody.innerHTML = "";
    rawData = [];

    buildHeader(file);

    input.disabled = false;
    input.focus();

    input.placeholder = "Đang nạp dữ liệu...";
    try {
        if (fileCache[file]) {
            rawData = fileCache[file];
        } else {
            const res = await fetch("data/" + file);
            const text = await res.text();
            rawData = text.split(/\r?\n/).filter(x => x.trim());
            fileCache[file] = rawData;
        }
        input.placeholder = "Nhập từ khóa tìm kiếm...";
    } catch (err) {
        input.placeholder = "Lỗi: Không tải được dữ liệu!";
        console.error(err);
    }
}

loadFile(currentFile);

/* =====================
   HEADER TABLE
===================== */
function buildHeader(file) {
    if (file === "dbhc.txt")
        thead.innerHTML = "<th>Mã</th><th>Phường / Xã</th><th>Tỉnh / Huyện</th>";
    else if (file === "kbnn.txt")
        thead.innerHTML = "<th>Tên Kho bạc</th><th>Mã</th><th>Tỉnh</th>";
    else
        thead.innerHTML = "<th>Mã</th><th>Ngân hàng</th>";
}

/* =====================
   SEARCH DBHC
===================== */
function searchDBHC(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ");
    let results = [];

    for (let line of rawData) {
        const cols = line.split(/\t| {2,}/);
        const ma = cols[0] || "";
        const ten = cols[1] || "";
        const tinh = cols[2] || "";

        const nTen = normalize(ten);
        const nTinh = normalize(tinh);
        const full = normalize(ten + " " + tinh);

        let score = 0;
        if (nTen === q) score += 1000;
        if (nTen.includes(q)) score += 800;
        if (full.includes(q)) score += 600;

        const tenWords = nTen.split(" ");
        if (keys.length === tenWords.length) {
            const a = [...keys].sort().join(" ");
            const b = [...tenWords].sort().join(" ");
            if (a === b) score += 300;
        }

        keys.forEach(k => {
            if (nTen.includes(k)) score += 80;
            if (nTinh.includes(k)) score += 40;
        });

        if (ma.includes(keyword)) score += 900;
        if (score > 0) results.push({ line, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
}

/* =====================
   SEARCH NGÂN HÀNG & KBNN (ĐÃ TỐI ƯU ALIAS)
===================== */
function searchNormal(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ").filter(k => k.trim() !== "");
    let results = [];
    
    // Kiểm tra xem có đang ở tab Ngân hàng hay không
    const isNganHang = currentFile === "nganhang.txt";

    for (let line of rawData) {
        let n = normalize(line);
        
        // NẾU LÀ NGÂN HÀNG: Tự động đính kèm tên chéo vào chuỗi tìm kiếm
        if (isNganHang) {
            bankAliases.forEach(pair => {
                if (n.includes(pair[0]) && !n.includes(pair[1])) n += " " + pair[1];
                else if (n.includes(pair[1]) && !n.includes(pair[0])) n += " " + pair[0];
            });
        }

        const isMatchAll = keys.every(k => n.includes(k));
        if (!isMatchAll) continue; 

        let score = 0;
        if (n.includes(q)) score += 1000; 

        keys.forEach(k => {
            const paddedN = " " + n + " ";
            const paddedK = " " + k + " ";
            if (paddedN.includes(paddedK)) score += 50; 
            else score += 20; 
        });
        results.push({ line, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
}

/* =====================
   SỰ KIỆN TÌM KIẾM REAL-TIME 
===================== */
input.addEventListener("input", () => {
    const keyword = input.value.trim();
    if (!keyword) {
        tbody.innerHTML = "";
        return;
    }

    let results = [];
    if (currentFile === "dbhc.txt") {
        results = searchDBHC(keyword);
    } else {
        results = searchNormal(keyword);
    }

    renderResults(results, keyword);
});

/* =====================
   SỰ KIỆN CHUYỂN TAB
===================== */
tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFile = tab.dataset.file.trim(); 
        loadFile(currentFile);
    };
});
