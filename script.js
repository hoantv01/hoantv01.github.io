let rawData = [];
let currentFile = "dbhc.txt";
let lastResult = [];

// BỘ NHỚ ĐỆM: Chuyển tab qua lại sẽ không bao giờ phải tải lại file nữa!
const fileCache = {};

const input = document.getElementById("searchInput");
const tbody = document.getElementById("results");
const thead = document.getElementById("table-head");
const tabs = document.querySelectorAll(".tab");

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
   LOAD FILE (NHANH NHƯ CHỚP)
===================== */
async function loadFile(file) {
    // Trả lại sự tự do: Không khóa input, dọn dẹp sạch sẽ để gõ luôn
    input.value = "";
    tbody.innerHTML = "";
    rawData = [];

    buildHeader(file);

    // Chỉ báo "Đang nạp" duy nhất cho file ĐVSDNS ở lần click đầu tiên
    if (file.includes("madbhcdonvi") && !fileCache[file]) {
        input.disabled = true;
        input.placeholder = "Đang nạp danh mục ĐVSDNS...";
    } else {
        input.disabled = false;
        input.placeholder = "Nhập từ khóa tìm kiếm...";
    }

    try {
        // Tuyệt chiêu: Nếu file đã nằm trong Cache thì lấy ra dùng luôn (0s)
        if (fileCache[file]) {
            rawData = fileCache[file];
        } else {
            // Chưa có thì mới fetch từ GitHub về
            if (file.includes("madbhcdonvi")) {
                const res = await fetch("data/madbhcdonvi.json");
                rawData = await res.json();
            } else {
                const res = await fetch("data/" + file);
                const text = await res.text();
                rawData = text.split(/\r?\n/).filter(x => x.trim());
            }
            // Lưu vào bộ nhớ đệm
            fileCache[file] = rawData;
        }
        
        input.disabled = false;
        input.placeholder = "Nhập từ khóa tìm kiếm...";
        input.focus();
        
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
    else if (file.includes("madbhcdonvi")) 
        thead.innerHTML = "<th>Mã ĐVSDNS</th><th>Tên đơn vị</th><th>Mã ĐBHC</th>";
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
   SEARCH NGÂN HÀNG & KBNN
===================== */
function searchNormal(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ").filter(k => k.trim() !== "");
    let results = [];

    for (let line of rawData) {
        const n = normalize(line);
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
   SEARCH ĐVSDNS (TỐI ƯU HÓA JSON)
===================== */
function searchDVSDNS(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ").filter(k => k.trim() !== "");
    const qLower = keyword.trim().toLowerCase();
    let results = [];

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        const ma = (row[0] || "").toLowerCase();
        const maDBHC = (row[2] || "").toLowerCase();
        const nTen = row[3] || ""; 

        const isMatchAll = keys.every(k => 
            ma.includes(k) || 
            nTen.includes(k) || 
            maDBHC.includes(k)
        );
        
        if (!isMatchAll) continue;

        let score = 0;

        if (ma === qLower) score += 2000;
        else if (ma.includes(qLower)) score += 900;
        
        if (maDBHC === qLower) score += 1500;
        else if (maDBHC.includes(qLower)) score += 700;

        if (nTen === q) score += 1000;        
        if (nTen.includes(q)) score += 800;   

        keys.forEach(k => {
            const paddedN = " " + nTen + " ";
            const paddedK = " " + k + " ";
            if (paddedN.includes(paddedK)) score += 50; 
            else if (nTen.includes(k)) score += 20;      
        });

        if (score > 0) {
            const line = `${row[0]}\t${row[1]}\t${row[2]}`;
            results.push({ line, score });
        }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
}

/* =====================
   SỰ KIỆN TÌM KIẾM
===================== */
input.addEventListener("input", () => {
    tbody.innerHTML = "";
    lastResult = [];

    const keyword = input.value.trim();
    if (!keyword) return;

    let results = [];

    if (currentFile === "dbhc.txt") {
        results = searchDBHC(keyword);
    } else if (currentFile.includes("madbhcdonvi")) {
        results = searchDVSDNS(keyword); 
    } else {
        results = searchNormal(keyword);
    }

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

        // TÙY CHỈNH: Click copy cột 3 cho ĐVSDNS, cột 1 cho các tab khác
        tr.onclick = () => {
            let textToCopy = "";
            let message = "";

            if (currentFile.includes("madbhcdonvi")) {
                textToCopy = cols[2] || ""; // Cột thứ 3 (Mã ĐBHC)
                message = "Đã copy Mã ĐBHC: " + textToCopy;
            } else {
                textToCopy = cols[0] || ""; // Cột thứ 1 (Mã thông thường)
                message = "Đã copy Mã: " + textToCopy;
            }

            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => alert(message))
                    .catch(err => console.error("Lỗi copy: ", err));
            }
        };
        tr.style.cursor = "pointer";
        
        tbody.appendChild(tr);
    });
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
