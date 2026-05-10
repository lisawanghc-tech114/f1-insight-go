import Papa from 'papaparse';

/**
 * 讀取 public/data/ 下的 CSV 檔案，回傳 array of objects
 *
 * @param {string} filename - 例如 "laps.csv"
 * @returns {Promise<Array<Object>>}
 *
 * @example
 *   const laps = await loadCSV('laps.csv');
 *   const accurate = laps.filter(l => l.IsAccurate === true);
 */
export async function loadCSV(filename) {
  const response = await fetch(`/data/${filename}`);
  if (!response.ok) {
    throw new Error(`無法讀取 /data/${filename}：${response.status}`);
  }
  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,         // 自動把 "123" 轉成 123
      skipEmptyLines: true,
      // pandas 把 boolean 寫成字串 "True"/"False"，PapaParse 不會自動轉
      // 所以這裡手動 normalize 成真正的 boolean
      transform: (value) => {
        if (value === 'True') return true;
        if (value === 'False') return false;
        return value;
      },
      complete: (results) => resolve(results.data),
      error: reject,
    });
  });
}

/**
 * 一次讀多張 CSV，回傳 { laps, results, weather, ... }
 */
export async function loadAllCSV(filenames) {
  const entries = await Promise.all(
    filenames.map(async (name) => {
      const data = await loadCSV(`${name}.csv`);
      return [name, data];
    })
  );
  return Object.fromEntries(entries);
}
