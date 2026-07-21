# Feature engineering rough planning draft - 01

## 01 - Feature engineering concepts that i'm familiar with 

### Scaling and normalising data - 
- `StandardScaler()`
- `MinMaxScaler()`
- `PolynomialFeatures()` - i'm not going to be using this one a lot

How will this apply into my project ? 

After the user will specify which column is the target column, we can just do - 
 - Apply a preprocessor to x_train.
 - save that preprocessor
 - use the same preprocessor to normalise/scale the cv/dev dataset and then we can make our predictions and stuff

**NOTE**
: User the same preprocessor that you used for x_train in order to fit the dev and test sets

### Preparing the data for metrics and evaluation - 
- Splitting the data into train, cv/dev and test sets

As is obvious, training test is to train the data obviously, and we'll train how decent the data was trained (no overfitting and underfitting) using our cv/dev set, and we'll select the model which gave the the least error on the 
cv/dev set. but at the end we'll report our results with the test set so that it's a decent generalisaton