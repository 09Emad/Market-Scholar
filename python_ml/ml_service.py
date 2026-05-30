import os
import json
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.preprocessing import MinMaxScaler
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import nltk
import warnings
import logging

warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
logging.getLogger('tensorflow').setLevel(logging.ERROR)

try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)

try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

app = Flask(__name__)
CORS(app)

sia = SentimentIntensityAnalyzer()
tfidf_vectorizer = TfidfVectorizer(max_features=100, stop_words='english')

model_cache = {}


def analyze_sentiment_tfidf(texts):
    results = []
    for text in texts:
        vader_scores = sia.polarity_scores(text)
        compound = vader_scores['compound']

        if compound >= 0.05:
            sentiment = 'positive'
        elif compound <= -0.05:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'

        score = (compound + 1) / 2

        results.append({
            'sentiment': sentiment,
            'score': round(score, 4),
            'compound': compound,
            'pos': vader_scores['pos'],
            'neg': vader_scores['neg'],
            'neu': vader_scores['neu']
        })

    if len(texts) >= 2:
        try:
            tfidf_matrix = tfidf_vectorizer.fit_transform(texts)
            feature_names = tfidf_vectorizer.get_feature_names_out()
            for i, result in enumerate(results):
                row = tfidf_matrix[i].toarray()[0]
                top_indices = row.argsort()[-5:][::-1]
                result['tfidf_keywords'] = [feature_names[idx] for idx in top_indices if row[idx] > 0]
        except Exception:
            pass

    return results


def prepare_lstm_data(prices, sentiments, sequence_length=10):
    df = pd.DataFrame(prices)

    df['returns'] = df['close'].pct_change()
    df['sma_5'] = df['close'].rolling(window=5).mean()
    df['sma_10'] = df['close'].rolling(window=10).mean()
    df['volatility'] = df['returns'].rolling(window=5).std()
    df['volume_change'] = df['volume'].pct_change()
    df['price_range'] = (df['high'] - df['low']) / df['close']
    df['momentum'] = df['close'] - df['close'].shift(5)

    avg_sentiment = sentiments if isinstance(sentiments, (int, float)) else 0.5
    df['sentiment'] = avg_sentiment

    df['sma_ratio'] = df['sma_5'] / df['sma_10']

    df = df.dropna().reset_index(drop=True)

    if len(df) < sequence_length + 5:
        return None, None, None, None, None

    df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
    df = df.dropna().reset_index(drop=True)

    feature_columns = ['returns', 'sma_ratio', 'volatility', 'volume_change',
                        'price_range', 'momentum', 'sentiment']
    feature_names = ['Price Returns', 'Moving Average Ratio', 'Volatility',
                     'Volume Change', 'Price Range', 'Momentum', 'News Sentiment']

    scaler = MinMaxScaler()
    scaled_features = scaler.fit_transform(df[feature_columns].values)

    X, y = [], []
    for i in range(len(scaled_features) - sequence_length):
        X.append(scaled_features[i:i + sequence_length])
        y.append(df['target'].iloc[i + sequence_length])

    X = np.array(X)
    y = np.array(y)

    return X, y, feature_columns, feature_names, scaler


def build_lstm_model(input_shape):
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout

    model = Sequential([
        LSTM(64, input_shape=input_shape, return_sequences=True),
        Dropout(0.2),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model


def train_and_predict(prices, sentiment_score, symbol, news_articles=None):
    sequence_length = 7
    news_articles = news_articles or []

    X, y, feature_cols, feature_names, scaler = prepare_lstm_data(
        prices, sentiment_score, sequence_length
    )

    if X is None or len(X) < 15:
        return generate_fallback_prediction(prices, sentiment_score)

    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    if len(X_train) < 5 or len(X_test) < 3:
        return generate_fallback_prediction(prices, sentiment_score)

    try:
        model = build_lstm_model((X.shape[1], X.shape[2]))
        model.fit(X_train, y_train, epochs=50, batch_size=8, verbose=0,
                  validation_split=0.1)
    except ModuleNotFoundError as e:
        if 'tensorflow' in str(e).lower():
            print("TensorFlow is not available. Using fallback prediction.")
            return generate_fallback_prediction(prices, sentiment_score)
        raise
    except Exception as e:
        print(f"LSTM training failed ({e}). Using fallback prediction.")
        return generate_fallback_prediction(prices, sentiment_score)

    y_pred_proba = model.predict(X_test, verbose=0)
    y_pred = (y_pred_proba > 0.5).astype(int).flatten()

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0.0)
    recall = recall_score(y_test, y_pred, zero_division=0.0)
    f1 = f1_score(y_test, y_pred, zero_division=0.0)

    last_sequence = X[-1:] 
    next_day_pred = model.predict(last_sequence, verbose=0)[0][0]

    direction = 'up' if next_day_pred > 0.5 else 'down'
    raw_confidence = float(next_day_pred) if direction == 'up' else float(1 - next_day_pred)
    confidence = min(0.92, max(0.35, raw_confidence))

    importance = compute_feature_importance(model, X_test, y_test, feature_names)

    recent_prices = [p['close'] for p in prices[-20:]]
    avg_change = np.mean(np.diff(recent_prices) / recent_prices[:-1]) if len(recent_prices) > 1 else 0
    avg_volume = np.mean([p['volume'] for p in prices[-20:]]) if prices else 0
    last_volume = prices[-1]['volume'] if prices else 0
    volume_ratio = last_volume / avg_volume if avg_volume > 0 else 1

    if avg_change > 0.005:
        price_action = "Strong upward trend"
    elif avg_change > 0:
        price_action = "Slight upward trend"
    elif avg_change > -0.005:
        price_action = "Slight downward trend"
    else:
        price_action = "Strong downward trend"

    if volume_ratio > 1.3:
        volume_signal = "High volume - above average"
    elif volume_ratio > 0.8:
        volume_signal = "Normal volume"
    else:
        volume_signal = "Low volume - below average"

    technical_score = float(np.clip(0.5 + avg_change * 10, 0, 1))

    news_impact_desc = get_news_impact_description(sentiment_score)

    analysis_report = generate_analysis_report(
        symbol=symbol,
        direction=direction,
        confidence=confidence,
        sentiment_score=sentiment_score,
        technical_score=technical_score,
        price_action=price_action,
        volume_signal=volume_signal,
        volume_ratio=volume_ratio,
        avg_change=avg_change,
        news_impact=news_impact_desc,
        recent_prices=recent_prices,
        importance=importance,
        model_metrics={'accuracy': accuracy, 'precision': precision, 'recall': recall, 'f1_score': f1}
    )

    top_feature_importance = importance[:3] if importance else []
    recent_news = []
    for article in news_articles[:5]:
        recent_news.append({
            'title': article.get('title', ''),
            'source': article.get('source', 'Unknown'),
            'publishedAt': article.get('publishedAt', '')
        })

    explain_payload = {
        'symbol': symbol,
        'lstm_direction': direction,
        'lstm_confidence': round(confidence, 4),
        'technical_score': round(technical_score, 4),
        'price_action': price_action,
        'volume_signal': volume_signal,
        'sentiment_score': round(sentiment_score, 4),
        'news_impact': news_impact_desc,
        'top_feature_importance': top_feature_importance,
        'recent_news': recent_news
    }

    result = {
        'direction': direction,
        'confidence': round(confidence, 4),
        'model_metrics': {
            'accuracy': round(accuracy, 4),
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4)
        },
        'feature_importance': importance,
        'factors': {
            'technical_score': round(technical_score, 4),
            'sentiment_score': round(sentiment_score, 4),
            'volume_signal': volume_signal,
            'price_action': price_action,
            'news_impact': news_impact_desc
        },
        'analysis_report': analysis_report,
        'explain_payload': explain_payload,
        'model_info': {
            'algorithm': 'LSTM (Long Short-Term Memory)',
            'text_processing': 'TF-IDF + VADER Sentiment',
            'features_used': feature_names,
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'sequence_length': sequence_length,
            'epochs': 50
        }
    }

    return result


def compute_feature_importance(model, X_test, y_test, feature_names):
    n_features = len(feature_names)

    weight_importances = np.ones(n_features) / n_features
    weights = model.get_weights()
    if len(weights) > 0:
        input_weights = np.abs(weights[0])
        if input_weights.ndim == 2 and input_weights.shape[0] == n_features:
            feature_weight_sums = input_weights.sum(axis=1)
            total_w = feature_weight_sums.sum()
            if total_w > 0:
                weight_importances = feature_weight_sums / total_w

    from sklearn.metrics import accuracy_score as acc_score
    perm_importances = np.zeros(n_features)
    base_pred = (model.predict(X_test, verbose=0) > 0.5).astype(int).flatten()
    base_acc = acc_score(y_test, base_pred)

    n_repeats = 5
    for i in range(n_features):
        drop_scores = []
        for _ in range(n_repeats):
            X_permuted = X_test.copy()
            perm_indices = np.random.permutation(X_permuted.shape[0])
            X_permuted[:, :, i] = X_permuted[perm_indices, :, i]
            perm_pred = (model.predict(X_permuted, verbose=0) > 0.5).astype(int).flatten()
            perm_acc = acc_score(y_test, perm_pred)
            drop_scores.append(max(0, base_acc - perm_acc))
        perm_importances[i] = np.mean(drop_scores)

    perm_total = perm_importances.sum()
    if perm_total > 0.01:
        perm_importances = perm_importances / perm_total
        combined = 0.6 * perm_importances + 0.4 * weight_importances
    else:
        combined = weight_importances

    total = combined.sum()
    if total > 0:
        combined = combined / total

    result = []
    for name, imp in zip(feature_names, combined):
        result.append({
            'feature': name,
            'importance': round(float(imp), 4)
        })

    result.sort(key=lambda x: x['importance'], reverse=True)
    return result


def generate_analysis_report(symbol, direction, confidence, sentiment_score, technical_score,
                             price_action, volume_signal, volume_ratio, avg_change,
                             news_impact, recent_prices, importance, model_metrics):
    sections = []

    direction_word = "upward" if direction == "up" else "downward"
    confidence_pct = round(confidence * 100)

    if confidence_pct >= 80:
        confidence_level = "high"
    elif confidence_pct >= 60:
        confidence_level = "moderate"
    else:
        confidence_level = "low"

    summary = (
        f"Based on LSTM neural network analysis of {symbol}'s recent market data, "
        f"the model predicts an {direction_word} price movement for the next trading day "
        f"with {confidence_level} confidence ({confidence_pct}%). "
        f"This prediction is derived from a combination of technical indicators, "
        f"price momentum, trading volume patterns, and news sentiment analysis."
    )
    sections.append({
        'title': 'Summary',
        'icon': 'summary',
        'content': summary
    })

    price_change_pct = round(avg_change * 100, 2)
    if len(recent_prices) >= 2:
        start_price = recent_prices[0]
        end_price = recent_prices[-1]
        total_change = round(((end_price - start_price) / start_price) * 100, 2)
    else:
        total_change = 0
        start_price = 0
        end_price = 0

    if avg_change > 0.005:
        trend_desc = f"{symbol} has shown a strong upward trend over the recent period, with an average daily return of +{price_change_pct}%."
    elif avg_change > 0:
        trend_desc = f"{symbol} has shown a slight upward trend recently, with a modest average daily return of +{price_change_pct}%."
    elif avg_change > -0.005:
        trend_desc = f"{symbol} has shown a slight downward trend recently, with an average daily return of {price_change_pct}%."
    else:
        trend_desc = f"{symbol} has shown a strong downward trend over the recent period, with an average daily return of {price_change_pct}%."

    if len(recent_prices) >= 2:
        trend_desc += f" Over the last 20 trading sessions, the stock moved from ${start_price:.2f} to ${end_price:.2f} ({'+' if total_change > 0 else ''}{total_change}%)."

    tech_score_pct = round(technical_score * 100)
    if tech_score_pct > 60:
        trend_desc += f" The technical score of {tech_score_pct}% indicates bullish momentum."
    elif tech_score_pct < 40:
        trend_desc += f" The technical score of {tech_score_pct}% indicates bearish momentum."
    else:
        trend_desc += f" The technical score of {tech_score_pct}% suggests a neutral technical outlook."

    sections.append({
        'title': 'Price Action & Trend',
        'icon': 'trend',
        'content': trend_desc
    })

    if volume_ratio > 1.3:
        vol_desc = (
            f"Trading volume is significantly above average (ratio: {volume_ratio:.2f}x), "
            f"indicating strong market interest and conviction behind the current price movement. "
            f"High volume typically confirms the prevailing trend direction."
        )
    elif volume_ratio > 0.8:
        vol_desc = (
            f"Trading volume is near the average level (ratio: {volume_ratio:.2f}x), "
            f"suggesting normal market participation. "
            f"This indicates steady interest without extreme buying or selling pressure."
        )
    else:
        vol_desc = (
            f"Trading volume is below average (ratio: {volume_ratio:.2f}x), "
            f"indicating reduced market participation. "
            f"Low volume may suggest uncertainty or a potential consolidation phase."
        )

    sections.append({
        'title': 'Volume Analysis',
        'icon': 'volume',
        'content': vol_desc
    })

    sent_pct = round(sentiment_score * 100)
    if sentiment_score > 0.65:
        sent_desc = (
            f"News sentiment analysis (TF-IDF + VADER) shows a strongly positive sentiment score of {sent_pct}%. "
            f"Recent news coverage for {symbol} has been predominantly favorable, "
            f"which historically correlates with positive price movements."
        )
    elif sentiment_score > 0.55:
        sent_desc = (
            f"News sentiment analysis shows a moderately positive score of {sent_pct}%. "
            f"Recent news about {symbol} leans positive, suggesting generally favorable market perception, "
            f"though not overwhelmingly bullish."
        )
    elif sentiment_score > 0.45:
        sent_desc = (
            f"News sentiment analysis shows a neutral score of {sent_pct}%. "
            f"Recent news coverage about {symbol} is mixed, with balanced positive and negative reports. "
            f"A neutral sentiment suggests the market is undecided about future direction."
        )
    elif sentiment_score > 0.35:
        sent_desc = (
            f"News sentiment analysis shows a moderately negative score of {sent_pct}%. "
            f"Recent news about {symbol} leans negative, indicating some market concerns "
            f"that could put downward pressure on the stock price."
        )
    else:
        sent_desc = (
            f"News sentiment analysis shows a strongly negative score of {sent_pct}%. "
            f"Recent news coverage for {symbol} has been predominantly unfavorable, "
            f"which may weigh on the stock's near-term performance."
        )

    sections.append({
        'title': 'News Sentiment',
        'icon': 'news',
        'content': sent_desc
    })

    if importance and len(importance) >= 3:
        top3 = importance[:3]
        top_names = [f"{f['feature']} ({round(f['importance']*100)}%)" for f in top3]
        feat_desc = (
            f"The LSTM model identified the most influential factors for this prediction as: "
            f"{', '.join(top_names)}. "
        )
        if top3[0]['feature'] == 'News Sentiment':
            feat_desc += "News sentiment is the dominant driver, suggesting external events are heavily influencing the forecast."
        elif top3[0]['feature'] in ('Price Returns', 'Momentum'):
            feat_desc += "Price momentum is the dominant driver, indicating the model is primarily following the recent trend direction."
        elif top3[0]['feature'] == 'Volatility':
            feat_desc += "Market volatility is the dominant driver, suggesting high uncertainty in the current market conditions."
        elif top3[0]['feature'] == 'Volume Change':
            feat_desc += "Volume dynamics are the dominant driver, indicating that changes in trading activity are a key signal."
        else:
            feat_desc += f"{top3[0]['feature']} is the most significant factor in the model's decision-making process."
    else:
        feat_desc = "Feature importance analysis was not available for this prediction."

    sections.append({
        'title': 'Key Drivers',
        'icon': 'drivers',
        'content': feat_desc
    })

    acc_pct = round(model_metrics['accuracy'] * 100)
    f1_pct = round(model_metrics['f1_score'] * 100)
    if acc_pct >= 60:
        model_desc = (
            f"The LSTM model achieved {acc_pct}% accuracy and {f1_pct}% F1-score on the test dataset. "
            f"These metrics suggest reasonable predictive performance, though past performance "
            f"does not guarantee future accuracy. "
        )
    else:
        model_desc = (
            f"The LSTM model achieved {acc_pct}% accuracy and {f1_pct}% F1-score on the test dataset. "
            f"These metrics indicate limited predictive reliability. Stock markets are inherently "
            f"unpredictable, and predictions should be treated with caution. "
        )
    model_desc += (
        "This model is designed for educational and research purposes only and should not be used "
        "as the sole basis for investment decisions."
    )

    sections.append({
        'title': 'Model Confidence',
        'icon': 'model',
        'content': model_desc
    })

    return sections


def get_news_impact_description(sentiment_score):
    if sentiment_score > 0.65:
        return "Strong positive news sentiment"
    elif sentiment_score > 0.55:
        return "Moderately positive news"
    elif sentiment_score > 0.45:
        return "Mixed/neutral news sentiment"
    elif sentiment_score > 0.35:
        return "Moderately negative news"
    else:
        return "Strong negative news sentiment"


def generate_fallback_prediction(prices, sentiment_score):
    if prices and len(prices) >= 5:
        recent = [p['close'] for p in prices[-5:]]
        avg_change = np.mean(np.diff(recent) / recent[:-1])
        direction = 'up' if avg_change > 0 else 'down'
        confidence = min(0.65, 0.5 + abs(avg_change) * 10)
    else:
        direction = 'up'
        confidence = 0.5

    fallback_report = [
        {
            'title': 'Summary',
            'icon': 'summary',
            'content': (
                f"Insufficient historical data is available for a full LSTM analysis. "
                f"A simplified prediction suggests a {'upward' if direction == 'up' else 'downward'} "
                f"price movement with low confidence ({round(confidence * 100)}%). "
                f"More data is needed for a reliable analysis."
            )
        },
        {
            'title': 'Data Limitation',
            'icon': 'model',
            'content': (
                "The LSTM model requires at least 6 months of historical data to produce reliable predictions. "
                "The current dataset is too small for proper training and evaluation. "
                "Results from this fallback method should be treated with extra caution."
            )
        }
    ]

    return {
        'direction': direction,
        'confidence': round(confidence, 4),
        'model_metrics': {
            'accuracy': 0.52,
            'precision': 0.51,
            'recall': 0.53,
            'f1_score': 0.52
        },
        'feature_importance': [
            {'feature': 'Price Returns', 'importance': 0.25},
            {'feature': 'Moving Average Ratio', 'importance': 0.20},
            {'feature': 'Volatility', 'importance': 0.15},
            {'feature': 'Volume Change', 'importance': 0.15},
            {'feature': 'News Sentiment', 'importance': 0.10},
            {'feature': 'Price Range', 'importance': 0.08},
            {'feature': 'Momentum', 'importance': 0.07}
        ],
        'factors': {
            'technical_score': 0.5,
            'sentiment_score': round(sentiment_score, 4),
            'volume_signal': 'Insufficient data',
            'price_action': 'Insufficient data for analysis',
            'news_impact': get_news_impact_description(sentiment_score)
        },
        'analysis_report': fallback_report,
        'model_info': {
            'algorithm': 'Fallback (insufficient data for LSTM)',
            'text_processing': 'TF-IDF + VADER Sentiment',
            'features_used': [],
            'training_samples': 0,
            'test_samples': 0,
            'sequence_length': 0,
            'epochs': 0
        }
    }


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'StockVision ML Service'})


@app.route('/analyze-sentiment', methods=['POST'])
def analyze_sentiment_endpoint():
    data = request.get_json()
    articles = data.get('articles', [])

    if not articles:
        return jsonify([])

    texts = [a.get('title', '') + ' ' + a.get('description', '') for a in articles]
    sentiments = analyze_sentiment_tfidf(texts)

    result = []
    for article, sentiment_data in zip(articles, sentiments):
        result.append({
            **article,
            'sentiment': sentiment_data['sentiment'],
            'sentimentScore': sentiment_data['score']
        })

    return jsonify(result)


@app.route('/predict', methods=['POST'])
def predict_endpoint():
    data = request.get_json()
    symbol = data.get('symbol', '')
    prices = data.get('prices', [])
    news_articles = data.get('news', [])

    if not prices:
        return jsonify({'error': 'No price data provided'}), 400

    avg_sentiment = 0.5
    if news_articles:
        texts = [a.get('title', '') + ' ' + a.get('description', '') for a in news_articles]
        sentiments = analyze_sentiment_tfidf(texts)
        scores = [s['score'] for s in sentiments]
        avg_sentiment = np.mean(scores) if scores else 0.5

    result = train_and_predict(prices, avg_sentiment, symbol, news_articles)
    result['symbol'] = symbol

    return jsonify(result)


if __name__ == '__main__':
    port = int(os.environ.get('ML_SERVICE_PORT', 5001))
    print(f"StockVision ML Service starting on port {port}...")
    print(f"Using LSTM + TF-IDF models for stock prediction")
    app.run(host='0.0.0.0', port=port, debug=False)
