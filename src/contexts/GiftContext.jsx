import React, { createContext, useState, useEffect, useContext } from "react";
import { PRESENT_TABLE_URL } from "../utils/config";

// 전역으로 관리될 Context 생성
const GiftContext = createContext();

export const useGift = () => {
  return useContext(GiftContext);
};

export const GiftProvider = ({ children }) => {
  const [giftList, setGiftList] = useState([]);
  const [giftDict, setGiftDict] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGifts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(PRESENT_TABLE_URL);
        if (!response.ok) {
          throw new Error("네트워크 응답이 정상이 아닙니다.");
        }
        const csvText = await response.text();
        const { list, dict } = parseCSV(csvText);
        setGiftList(list);
        setGiftDict(dict);
      } catch (err) {
        console.error("선물 목록 다운로드 실패:", err);
        setError("선물 목록을 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchGifts();
  }, []);

  const parseCSV = (csvText) => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return { list: [], dict: {} };

    const parsedList = [];
    const parsedDict = {};

    // 쉼표 분리 시 쌍따옴표 내부의 쉼표는 무시하는 정규식
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let columns = line.split(splitRegex);
      // 쌍따옴표 제거
      columns = columns.map((col) => col.replace(/^"|"$/g, "").trim());

      if (columns.length >= 6) {
        const itemName = columns[0];
        if (!itemName) continue;

        const parseStat = (statStr) => {
          if (!statStr || statStr.trim() === "") return null;
          const parts = statStr.trim().split(" ");
          if (parts.length >= 2) {
            return {
              key: parts[0].toLowerCase(),
              value: parseInt(parts[1], 10),
            };
          }
          return null;
        };

        const mainStat = parseStat(columns[3]);
        const subStat = parseStat(columns[4]);

        const stats = {};
        if (mainStat) stats[mainStat.key] = mainStat.value;
        if (subStat) stats[subStat.key] = subStat.value;

        // "진짜 작동하는 아이콘 URL"이 9번째 인덱스 (10번째 열) 쯤에 있다고 가정. 보통 길이에 따라 다름.
        // 만약 columns 길이가 10 이상이고, 9번 인덱스에 값이 있다면 그것을 씀. 아니면 1번.
        let actualIconUrl = columns[1];
        if (columns.length > 9 && columns[9]) {
          actualIconUrl = columns[9];
        }

        const giftObj = {
          id: i,
          name: itemName,
          iconUrl: actualIconUrl,
          familyName: columns[2] || "",
          stats: stats,
          description: columns[5] || "",
          rawMainStat: columns[3] || "",
          rawSubStat: columns[4] || "",
        };

        parsedList.push(giftObj);
        parsedDict[itemName] = giftObj; // 딕셔너리(객체) 맵핑
      }
    }
    return { list: parsedList, dict: parsedDict };
  };

  return (
    <GiftContext.Provider value={{ giftList, giftDict, loading, error }}>
      {children}
    </GiftContext.Provider>
  );
};
