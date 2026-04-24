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
  Tách logic hiển thị kết quả ra một hàm riêng
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
            let textToCopy = "";
            let message = "";

            if (currentFile.includes("madbhcdonvi")) {
                textToCopy = cols[2] || ""; 
                message = "Đã copy Mã ĐBHC: " + textToCopy;
            } else {
                textToCopy = cols[0] || ""; 
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
}

/* =====================
   LOAD FILE (NHANH NHƯ CHỚP)
===================== */
async function loadFile(file) {
    input.value = "";
    tbody.innerHTML = "";
    rawData = [];

    buildHeader(file);

    input.disabled = false;
    input.focus();

    if (file.includes("madbhcdonvi")) {
        // KHÔNG FETCH DỮ LIỆU Ở ĐÂY NỮA
        input.placeholder = "Nhập từ khóa và bấm ENTER để tìm...";
    } else {
        // Các file nhỏ (.txt) vẫn load bình thường
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
   SỰ KIỆN TÌM KIẾM THEO ENTER (CHO FILE LỚN)
===================== */
input.addEventListener("keydown", async (e) => {
    // Chỉ can thiệp khi là tab ĐVSDNS và người dùng bấm Enter
    if (currentFile.includes("madbhcdonvi") && e.key === "Enter") {
        const keyword = input.value.trim();
        if (!keyword) return;

        // Báo hiệu đang xử lý
        const oldPlaceholder = input.placeholder;
        input.placeholder = "Đang nạp và tìm kiếm dữ liệu, vui lòng chờ...";
        input.disabled = true;
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Đang truy vấn dữ liệu lớn...</td></tr>";

        try {
            // Nạp dữ liệu (nếu chưa có trong cache)
            if (!fileCache[currentFile]) {
                const res = await fetch("data/madbhcdonvi.json");
                fileCache[currentFile] = await res.json();
            }
            
            // Gán dữ liệu cho rawData
            rawData = fileCache[currentFile];

            // Chạy thuật toán tìm kiếm
            const results = searchDVSDNS(keyword);
            
            // Hiển thị kết quả
            if (results.length === 0) {
                tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Không tìm thấy kết quả!</td></tr>";
            } else {
                renderResults(results, keyword);
            }

        } catch (err) {
            console.error(err);
            tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;color:red;'>Lỗi tải dữ liệu!</td></tr>";
        } finally {
            // Trả lại trạng thái input
            input.disabled = false;
            input.placeholder = oldPlaceholder;
            input.focus();
        }
    }
});

/* =====================
   SỰ KIỆN TÌM KIẾM REAL-TIME (CHO CÁC FILE NHỎ CÒN LẠI)
===================== */
input.addEventListener("input", () => {
    // Nếu là file lớn, bỏ qua sự kiện input (chờ Enter)
    if (currentFile.includes("madbhcdonvi")) return;

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
