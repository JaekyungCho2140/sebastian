"""LY/GL 테이블 병합"""
import os
import glob
import pandas as pd
from src.base_language_merger import BaseLanguageMerger


class LYGLMerger(BaseLanguageMerger):
    """LY/GL 7개 언어 파일 병합 클래스"""

    # PRD 5.1.2: 언어 코드 목록 (7개)
    LANGUAGE_CODES = ["EN", "CT", "CS", "JA", "TH", "PT-BR", "RU"]

    # PRD 5.1.3: 출력 헤더 구조
    OUTPUT_COLUMNS = [
        "Table", "KEY", "Source", "Target_EN", "Target_CT", "Target_CS",
        "Target_JA", "Target_TH", "Target_PT-BR", "Target_RU", "Status", "NOTE"
    ]

    def merge_lygl(self, folder_path):
        """LY/GL 7개 언어 파일 병합

        Args:
            folder_path: 언어 파일이 있는 폴더 경로

        Returns:
            dict: 병합 결과 (success, output_file, row_count)
        """
        try:
            # PRD 5.1.2: 파일명 패턴으로 파일 탐색 ({date}_{lang}.xlsx)
            all_files = glob.glob(os.path.join(folder_path, "*_*.xlsx"))

            # 날짜 접두사 자동 감지
            date_prefix = None
            dataframes = {}

            for lang_code in self.LANGUAGE_CODES:
                # 패턴 매칭: {date}_{lang}.xlsx
                pattern = os.path.join(folder_path, f"*_{lang_code}.xlsx")
                matching_files = glob.glob(pattern)

                if not matching_files:
                    return {
                        "success": False,
                        "error": f"7개 언어 파일이 필요합니다 (누락: {lang_code})"
                    }

                file_path = matching_files[0]

                # 날짜 접두사 추출 (첫 번째 파일에서)
                if date_prefix is None:
                    filename = os.path.basename(file_path)
                    date_prefix = filename.split("_")[0]

                # 파일 읽기 (PRD 5.1.4: 각 언어 파일 구조 고정)
                df = pd.read_excel(file_path, header=0)
                dataframes[lang_code] = df

            # PRD 5.1.5: 정확히 7개 파일 검증
            if len(dataframes) != 7:
                return {
                    "success": False,
                    "error": f"7개 언어 파일이 필요합니다 (현재: {len(dataframes)}개)"
                }

            # EN 파일에서 마스터 KEY 목록 추출
            en_df = dataframes["EN"]

            # 각 KEY에 대해 모든 언어 파일의 Target 값 수집
            merged_data = []

            for idx, en_row in en_df.iterrows():
                # EN 파일에서 기준 값 추출 (리팩토링: 베이스 클래스 메서드)
                key, table, source, status, note = self._extract_en_row_values(en_row)

                # PRD 5.1.5: Table, Source, Status, NOTE 일치 검증
                for lang_code, lang_df in dataframes.items():
                    if lang_code == "EN":
                        continue

                    # 해당 KEY 찾기
                    lang_row = lang_df[lang_df.iloc[:, self.COL_KEY] == key]

                    if lang_row.empty:
                        # PRD 5.1.5: KEY 일치 검증
                        return {
                            "success": False,
                            "error": f"KEY '{key}'가 {lang_code} 파일에 없습니다"
                        }

                    lang_row = lang_row.iloc[0]

                    # 필드 검증 (리팩토링: 베이스 클래스 메서드)
                    error = self._validate_row_fields(key, table, source, status, note, lang_row, lang_code)
                    if error:
                        return error

                # 모든 언어의 Target 값 수집
                row_data = {
                    "Table": table,
                    "KEY": key,
                    "Source": source,
                    "Status": status,
                    "NOTE": note,
                }

                # 각 언어의 Target 수집 (리팩토링: 베이스 클래스 메서드)
                for lang_code in self.LANGUAGE_CODES:
                    target_value = self._get_target_value(dataframes[lang_code], key)
                    row_data[f"Target_{lang_code}"] = target_value

                merged_data.append(row_data)

            # DataFrame 생성
            merged_df = pd.DataFrame(merged_data)

            # 열 순서 조정 (PRD 5.1.3)
            merged_df = merged_df[self.OUTPUT_COLUMNS]

            # NaN/inf 값 빈 문자열로 변환 (리팩토링: 베이스 클래스 메서드)
            merged_df = self._clean_dataframe(merged_df)

            # 서식 적용 및 저장
            output_filename = f"{date_prefix}_StringALL.xlsx"
            output_path = os.path.join(folder_path, output_filename)

            # Excel 저장 및 서식 적용 (리팩토링: 베이스 클래스 메서드)
            self._save_with_format(merged_df, output_path)

            return {
                "success": True,
                "output_file": output_path,
                "row_count": len(merged_df)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
