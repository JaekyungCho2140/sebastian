"""언어 파일 병합 공통 베이스 클래스"""
import pandas as pd
from src.excel_formatter import ExcelFormatter


class BaseLanguageMerger:
    """언어 파일 병합을 위한 공통 베이스 클래스"""

    # 각 언어 파일의 고정 열 구조 (NC/GL, LY/GL 공통)
    COL_TABLE = 0
    COL_KEY = 1
    COL_SOURCE = 2
    COL_TARGET = 3
    COL_STATUS = 4
    COL_NOTE = 5

    def __init__(self):
        """BaseLanguageMerger 초기화"""
        self.formatter = ExcelFormatter()

    def _validate_field_consistency(self, key, en_value, lang_value, lang_code, field_name):
        """필드 값 일치 검증

        Args:
            key: 검증 대상 KEY
            en_value: EN 파일의 필드 값
            lang_value: 다른 언어 파일의 필드 값
            lang_code: 언어 코드
            field_name: 필드명 (Table, Source, Status, NOTE)

        Returns:
            dict: 에러 발생 시 에러 딕셔너리, 정상이면 None
        """
        if pd.notna(lang_value) and lang_value != en_value:
            return {
                "success": False,
                "error": f"KEY '{key}'의 {field_name} 값이 언어별로 다릅니다. EN: '{en_value}', {lang_code}: '{lang_value}'"
            }
        return None

    def _extract_en_row_values(self, en_row):
        """EN 파일에서 기준 값 추출

        Args:
            en_row: EN DataFrame의 행

        Returns:
            tuple: (key, table, source, status, note)
        """
        key = en_row.iloc[self.COL_KEY] if pd.notna(en_row.iloc[self.COL_KEY]) else ""
        table = en_row.iloc[self.COL_TABLE] if pd.notna(en_row.iloc[self.COL_TABLE]) else ""
        source = en_row.iloc[self.COL_SOURCE] if pd.notna(en_row.iloc[self.COL_SOURCE]) else ""
        status = en_row.iloc[self.COL_STATUS] if pd.notna(en_row.iloc[self.COL_STATUS]) else ""
        note = en_row.iloc[self.COL_NOTE] if pd.notna(en_row.iloc[self.COL_NOTE]) else ""

        return key, table, source, status, note

    def _validate_row_fields(self, key, table, source, status, note, lang_row, lang_code):
        """행의 모든 필드 검증

        Args:
            key, table, source, status, note: EN 파일의 기준 값
            lang_row: 다른 언어 파일의 행
            lang_code: 언어 코드

        Returns:
            dict: 에러 발생 시 에러 딕셔너리, 정상이면 None
        """
        validations = [
            (table, lang_row.iloc[self.COL_TABLE], "Table"),
            (source, lang_row.iloc[self.COL_SOURCE], "Source"),
            (status, lang_row.iloc[self.COL_STATUS], "Status"),
            (note, lang_row.iloc[self.COL_NOTE], "NOTE"),
        ]

        for en_val, lang_val, field_name in validations:
            error = self._validate_field_consistency(key, en_val, lang_val, lang_code, field_name)
            if error:
                return error

        return None

    def _get_target_value(self, lang_df, key):
        """언어 파일에서 KEY에 해당하는 Target 값 추출

        Args:
            lang_df: 언어 DataFrame
            key: 검색할 KEY

        Returns:
            str: Target 값 (없으면 빈 문자열)
        """
        lang_row = lang_df[lang_df.iloc[:, self.COL_KEY] == key]

        if not lang_row.empty:
            target_value = lang_row.iloc[0].iloc[self.COL_TARGET]
            # NaN 값 처리
            if pd.isna(target_value):
                return ""
            return target_value
        else:
            return ""

    def _clean_dataframe(self, merged_df):
        """DataFrame의 NaN/inf 값을 빈 문자열로 변환

        Args:
            merged_df: 정리할 DataFrame

        Returns:
            DataFrame: 정리된 DataFrame
        """
        # NaN/inf 값 빈 문자열로 변환
        merged_df = merged_df.fillna("")
        merged_df = merged_df.replace([float('inf'), float('-inf')], "")

        # 모든 셀을 문자열로 변환하여 NaN 완전 제거
        for col in merged_df.columns:
            merged_df[col] = merged_df[col].apply(lambda x: "" if pd.isna(x) else str(x) if x != "" else "")

        return merged_df

    def _save_with_format(self, merged_df, output_path):
        """Excel 파일 저장 및 서식 적용

        Args:
            merged_df: 저장할 DataFrame
            output_path: 출력 파일 경로
        """
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            merged_df.to_excel(writer, index=False, sheet_name="Sheet1", na_rep="")
            ws = writer.sheets["Sheet1"]

            # 빈 문자열 셀을 명시적으로 빈 문자열로 설정
            for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
                for cell in row:
                    if cell.value is None:
                        cell.value = ""

            # 서식 적용
            self.formatter.apply_header_format(ws)
            self.formatter.apply_data_format(ws)
            self.formatter.freeze_panes(ws)
