"""NC/GL 테이블 병합"""
import os
import pandas as pd
from src.base_language_merger import BaseLanguageMerger


class NCGLMerger(BaseLanguageMerger):
    """NC/GL 8개 언어 파일 병합 클래스"""

    # PRD 4.3: 입력 파일명
    LANGUAGE_FILES = {
        "EN": "StringEnglish.xlsx",
        "CT": "StringTraditionalChinese.xlsx",
        "CS": "StringSimplifiedChinese.xlsx",
        "JA": "StringJapanese.xlsx",
        "TH": "StringThai.xlsx",
        "ES": "StringSpanish.xlsx",
        "PT": "StringPortuguese.xlsx",
        "RU": "StringRussian.xlsx",
    }

    # PRD 4.4: 출력 헤더 구조
    OUTPUT_COLUMNS = [
        "Key", "Source", "Target_EN", "Target_CT", "Target_CS",
        "Target_JA", "Target_TH", "Target_ES", "Target_PT", "Target_RU",
        "Comment", "TableName", "Status"
    ]

    def merge_ncgl(self, folder_path, yymmdd, milestone):
        """NC/GL 8개 언어 파일 병합

        Args:
            folder_path: 언어 파일이 있는 폴더 경로
            yymmdd: 업데이트일 (YYMMDD 형식)
            milestone: 마일스톤 차수

        Returns:
            dict: 병합 결과 (success, output_file, row_count)
        """
        try:
            # PRD 4.6 단계 1: 8개 파일 병렬 로드
            dataframes = {}
            missing_files = []

            for lang_code, filename in self.LANGUAGE_FILES.items():
                file_path = os.path.join(folder_path, filename)

                if not os.path.exists(file_path):
                    missing_files.append(filename)
                    continue

                # 파일 읽기 (PRD 4.5: 각 언어 파일 구조 고정)
                df = pd.read_excel(file_path, header=0)
                dataframes[lang_code] = df

            # 필수 파일 검증
            if missing_files:
                return {
                    "success": False,
                    "error": f"필요한 파일이 누락되었습니다: {', '.join(missing_files)}"
                }

            # PRD 4.6 단계 2: EN 파일에서 마스터 KEY 목록 추출
            en_df = dataframes["EN"]

            # PRD 4.6 단계 3: 각 KEY에 대해 모든 언어 파일의 Target 값 수집
            merged_data = []

            for idx, en_row in en_df.iterrows():
                # EN 파일에서 기준 값 추출 (리팩토링: 베이스 클래스 메서드)
                key, table, source, status, note = self._extract_en_row_values(en_row)

                # PRD 4.6 단계 4: Table, Source, Status, NOTE 일치 검증
                for lang_code, lang_df in dataframes.items():
                    if lang_code == "EN":
                        continue

                    # 해당 KEY 찾기
                    lang_row = lang_df[lang_df.iloc[:, self.COL_KEY] == key]

                    if lang_row.empty:
                        continue

                    lang_row = lang_row.iloc[0]

                    # 필드 검증 (리팩토링: 베이스 클래스 메서드)
                    error = self._validate_row_fields(key, table, source, status, note, lang_row, lang_code)
                    if error:
                        return error

                # 모든 언어의 Target 값 수집
                row_data = {
                    "Key": key,
                    "Source": source,
                    "TableName": table,
                    "Status": status,
                    "Comment": note,
                }

                # 각 언어의 Target 수집 (리팩토링: 베이스 클래스 메서드)
                for lang_code in ["EN", "CT", "CS", "JA", "TH", "ES", "PT", "RU"]:
                    target_value = self._get_target_value(dataframes[lang_code], key)
                    row_data[f"Target_{lang_code}"] = target_value

                merged_data.append(row_data)

            # DataFrame 생성
            merged_df = pd.DataFrame(merged_data)

            # 열 순서 조정 (PRD 4.4)
            merged_df = merged_df[self.OUTPUT_COLUMNS]

            # PRD 4.6 단계 5: NaN/inf 값 빈 문자열로 변환 (리팩토링: 베이스 클래스 메서드)
            merged_df = self._clean_dataframe(merged_df)

            # PRD 4.6 단계 6: 서식 적용 및 저장
            output_filename = f"{yymmdd}_M{milestone}_StringALL.xlsx"
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
